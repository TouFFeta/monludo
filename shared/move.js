/* ============================================================
   LUDO — MOTEUR DE COUP (navigateur + Node.js)
   ------------------------------------------------------------
   Ce fichier contient UNIQUEMENT l'application LOGIQUE d'un coup :
   - validation
   - mutation du pion joueur
   - résolution de capture
   - détection arrivée / victoire
   - détermination des bonus

   Ce fichier ne contient :
   - aucun accès au DOM
   - aucun timer
   - aucune animation
   - aucun await
   - aucune dépendance à gameState (tout passe par le paramètre `state`)

   Les règles elles-mêmes sont dans rules.js. La mutation primitive
   d'un pion est dans state.js.

   Chargement navigateur : voir index.html
	 constants.js → state.js → rules.js → bot.js → move.js → script.js

   Utilisation Node :
	 const Move = require("./shared/move.js");
   ============================================================ */

(function (root, factory) {
	if (typeof module === "object" && module.exports) {
		const constants = require("./constants.js");
		const state = require("./state.js");
		const rules = require("./rules.js");
		module.exports = factory(constants, state, rules);
	} else {
		root.LudoMove = factory(root.LudoConstants, root.LudoState, root.LudoRules);
	}
})(typeof self !== "undefined" ? self : this, function (C, S, R) {
	"use strict";

	if (!C) throw new Error("shared/move.js : constants.js doit être chargé avant.");
	if (!S) throw new Error("shared/move.js : state.js doit être chargé avant.");
	if (!R) throw new Error("shared/move.js : rules.js doit être chargé avant.");

	const { RULES, FINISH_POSITION } = C;
	const { setTokenPosition } = S;
	const {
		getToken,
		getTargetPosition,
		isLegalMove,
		analyserCaseArrivee,
		verifierVictoire
	} = R;

	/* ============================================================
	   APPLIQUER UN COUP
	   ------------------------------------------------------------
	   Signature identique à celle proposée dans le plan 5F :

		 appliquerCoup(state, color, tokenIndex, targetPosition,
					   diceValue, rolledSix)

	   Retourne :
		 {
		   ok: true | false,
		   error: "TOKEN_NOT_FOUND" | "ILLEGAL_MOVE",   // si ok === false
		   fromPosition,                                 // -1 si base
		   targetPosition,
		   tokenId,
		   captures: [token, ...],                       // victimes mutées à -1
		   captureBlocked: boolean,                      // capture refusée par protection
		   arrived: boolean,                             // pion arrivé au centre
		   victory: boolean,                             // 4 pions du joueur au centre
		   reasons: { six, capture, arrival },           // bonus de tour
		   bonus: boolean                                // au moins une raison
		 }

	   EFFETS DE BORD (volontaires) :
		 - mute token.position / token.state via setTokenPosition
		 - mute victim.position / victim.state via setTokenPosition

	   N'ALTÈRE PAS :
		 - currentPlayerIndex, consecutiveSixes, lastRollWasSix
		 - diceRolled, diceValue, legalMoves, isAnimatingMove
		 - history, winner
	   Ces éléments restent gérés par l'orchestration (script.js).
	   ============================================================ */

	function appliquerCoup(state, color, tokenIndex, targetPosition, diceValue, rolledSix) {
		const token = getToken(state, color, tokenIndex);
		if (!token) {
			return {
				ok: false,
				error: "TOKEN_NOT_FOUND",
				tokenId: null,
				fromPosition: null,
				targetPosition: targetPosition
			};
		}

		const fromPosition = token.position;
		const tokenId = token.id;

		if (!isLegalMove(state, color, tokenIndex, diceValue)
			|| targetPosition !== getTargetPosition(fromPosition, diceValue)) {
			return {
				ok: false,
				error: "ILLEGAL_MOVE",
				tokenId: tokenId,
				fromPosition: fromPosition,
				targetPosition: targetPosition
			};
		}

		/* --- 1. Mutation : le pion se déplace --- */
		setTokenPosition(token, targetPosition);

		/* --- 2. Capture : analyse de la case d'arrivée ---
		   La règle (case protégée, adversaires présents) est dans
		   rules.js : on l'appelle, on ne la réécrit pas. La mutation
		   des victimes est la conséquence logique du coup. */
		const analyse = analyserCaseArrivee(state, color, targetPosition);
		let captures = [];
		let captureBlocked = false;

		if (analyse.adversaires.length > 0) {
			if (analyse.estProtegee) {
				captureBlocked = true;
			} else {
				analyse.adversaires.forEach(victim => setTokenPosition(victim, -1));
				captures = analyse.adversaires;
			}
		}

		/* --- 3. Arrivée au centre --- */
		const arrived = (targetPosition === FINISH_POSITION);

		/* --- 4. Victoire (les 4 pions du joueur au centre) --- */
		const victory = verifierVictoire(state, color);

		/* --- 5. Raisons de bonus de tour --- */
		const reasons = {
			six:     !!(RULES.TOUR_SUPPLEMENTAIRE_SUR_6       && rolledSix),
			capture: !!(RULES.TOUR_SUPPLEMENTAIRE_SUR_CAPTURE && captures.length > 0),
			arrival: !!(RULES.TOUR_SUPPLEMENTAIRE_SUR_ARRIVEE && arrived)
		};
		const bonus = reasons.six || reasons.capture || reasons.arrival;

		return {
			ok: true,
			fromPosition: fromPosition,
			targetPosition: targetPosition,
			tokenId: tokenId,
			captures: captures,
			captureBlocked: captureBlocked,
			arrived: arrived,
			victory: victory,
			reasons: reasons,
			bonus: bonus
		};
	}

	/* ============================================================
	   TESTS INTERNES (console uniquement, jamais exécutés au chargement)
	   ------------------------------------------------------------
	   À lancer manuellement depuis la console :
		   LudoMove.runMoveSelfTests()
	   ============================================================ */

	function runMoveSelfTests() {
		const results = [];
		function assertRule(cond, msg) {
			if (!cond) throw new Error(msg);
		}
		function freshState() { return S.createInitialState(); }

		try {
			/* --- A. Déplacement normal --- */
			let st = freshState();
			S.setTokenPosition(getToken(st, "red", 0), 5);
			let r = appliquerCoup(st, "red", 0, 8, 3, false);
			assertRule(r.ok, "A: ok");
			assertRule(r.fromPosition === 5, "A: fromPosition");
			assertRule(r.targetPosition === 8, "A: targetPosition");
			assertRule(r.tokenId === "red-0", "A: tokenId");
			assertRule(getToken(st, "red", 0).position === 8, "A: mutation");
			assertRule(r.captures.length === 0, "A: pas de capture");
			assertRule(!r.arrived, "A: pas arrivé");
			assertRule(!r.victory, "A: pas victoire");
			assertRule(!r.bonus, "A: pas bonus");
			results.push("A. Déplacement normal");

			/* --- B. Sortie de base sur 6 --- */
			st = freshState();
			r = appliquerCoup(st, "red", 0, 0, 6, true);
			assertRule(r.ok, "B: ok");
			assertRule(getToken(st, "red", 0).position === 0, "B: pion sorti");
			assertRule(r.reasons.six === true, "B: bonus six");
			assertRule(r.bonus === true, "B: bonus actif");
			results.push("B. Sortie de base sur 6");

			/* --- C. Déplacement exact + arrivée --- */
			st = freshState();
			S.setTokenPosition(getToken(st, "red", 0), 54);
			r = appliquerCoup(st, "red", 0, 56, 2, false);
			assertRule(r.ok, "C: ok");
			assertRule(r.arrived === true, "C: arrivée");
			assertRule(r.reasons.arrival === true, "C: bonus arrivée");
			assertRule(getToken(st, "red", 0).position === 56, "C: position finale");
			results.push("C. Arrivée exacte");

			/* --- D. Dépassement interdit --- */
			st = freshState();
			S.setTokenPosition(getToken(st, "red", 0), 54);
			r = appliquerCoup(st, "red", 0, 57, 3, false);
			assertRule(r.ok === false, "D: refusé");
			assertRule(r.error === "ILLEGAL_MOVE", "D: code erreur");
			assertRule(getToken(st, "red", 0).position === 54, "D: token intact");
			results.push("D. Dépassement interdit");

			/* --- E. Capture normale --- */
			st = freshState();
			/* red 15 → ring 15 ; après déplacement de 3 → ring 18 */
			S.setTokenPosition(getToken(st, "red", 0), 15);
			/* green 5 → ring 18 (13 + 5) */
			S.setTokenPosition(getToken(st, "green", 0), 5);
			assertRule(
				R.getRingIndex("red", 18) === R.getRingIndex("green", 5),
				"E: préparation ring"
			);
			r = appliquerCoup(st, "red", 0, 18, 3, false);
			assertRule(r.ok, "E: ok");
			assertRule(r.captures.length === 1, "E: 1 capture");
			assertRule(getToken(st, "green", 0).position === -1, "E: victime en base");
			assertRule(r.reasons.capture === true, "E: bonus capture");
			results.push("E. Capture normale");

			/* --- F. Capture bloquée par case protégée (étoile ring 8) --- */
			st = freshState();
			S.setTokenPosition(getToken(st, "red", 0), 8);    /* red ring 8 */
			S.setTokenPosition(getToken(st, "green", 0), 44); /* green 44 → ring 5 ... non */
			/* green 47 → ring (13+47)%52 = 8. Utilisons 44 + 3 = 47. */
			r = appliquerCoup(st, "green", 0, 47, 3, false);
			assertRule(r.ok, "F: ok");
			assertRule(r.captures.length === 0, "F: pas de capture");
			assertRule(r.captureBlocked === true, "F: capture bloquée");
			assertRule(getToken(st, "red", 0).position === 8, "F: rouge intact");
			results.push("F. Capture bloquée par protection");

			/* --- G. Bloc adverse interdit --- */
			st = freshState();
			S.setTokenPosition(getToken(st, "red", 0), 5);
			S.setTokenPosition(getToken(st, "red", 1), 5);      /* bloc rouge ring 5 */
			S.setTokenPosition(getToken(st, "green", 0), 43);   /* green 43 → ring 56%52 = 4 */
			/* green 44 → ring 5 */
			r = appliquerCoup(st, "green", 0, 44, 1, false);
			assertRule(r.ok === false, "G: refusé");
			assertRule(r.error === "ILLEGAL_MOVE", "G: illégal");
			results.push("G. Bloc adverse interdit");

			/* --- H. Pont strictement supérieur (4 > 3) --- */
			st = freshState();
			for (let i = 0; i < 4; i++) S.setTokenPosition(getToken(st, "green", i), 5);
			for (let i = 0; i < 3; i++) S.setTokenPosition(getToken(st, "red", i), 22);
			r = appliquerCoup(st, "green", 0, 10, 5, false);
			assertRule(r.ok === true, "H: traverse autorisé");
			assertRule(getToken(st, "green", 0).position === 10, "H: pion en 10");
			results.push("H. Pont 4 > 3 traverse");

			/* --- I. Pont égal (3 == 3) --- */
			st = freshState();
			for (let i = 0; i < 3; i++) S.setTokenPosition(getToken(st, "green", i), 5);
			for (let i = 0; i < 3; i++) S.setTokenPosition(getToken(st, "red", i), 22);
			r = appliquerCoup(st, "green", 0, 10, 5, false);
			assertRule(r.ok === false, "I: refusé");
			results.push("I. Pont 3 = 3 bloqué");

			/* --- J. Victoire --- */
			st = freshState();
			for (let i = 0; i < 3; i++) S.setTokenPosition(getToken(st, "red", i), 56);
			S.setTokenPosition(getToken(st, "red", 3), 54);
			r = appliquerCoup(st, "red", 3, 56, 2, false);
			assertRule(r.ok, "J: ok");
			assertRule(r.arrived === true, "J: arrivée");
			assertRule(r.victory === true, "J: victoire");
			results.push("J. Victoire");

			/* --- K. Identité pion inchangée --- */
			st = freshState();
			const before = getToken(st, "red", 0);
			const idBefore = before.id;
			const colorBefore = before.color;
			S.setTokenPosition(before, 5);
			r = appliquerCoup(st, "red", 0, 8, 3, false);
			const after = getToken(st, "red", 0);
			assertRule(after.id === idBefore, "K: id inchangé");
			assertRule(after.color === colorBefore, "K: couleur inchangée");
			assertRule(after.player === colorBefore, "K: player inchangé");
			results.push("K. Identité pion inchangée");

			/* --- L. Restart : état frais --- */
			const s1 = freshState();
			S.setTokenPosition(getToken(s1, "red", 0), 10);
			const s2 = freshState();
			assertRule(getToken(s2, "red", 0).position === -1, "L: nouvel état propre");
			assertRule(getToken(s2, "red", 0).state === "BASE", "L: state BASE");
			results.push("L. Restart état propre");

			/* --- M. Plusieurs blocs sur le trajet --- */
			st = freshState();
			for (let i = 0; i < 4; i++) S.setTokenPosition(getToken(st, "green", i), 5);
			for (let i = 0; i < 2; i++) S.setTokenPosition(getToken(st, "red", i), 22);
			for (let i = 0; i < 2; i++) S.setTokenPosition(getToken(st, "yellow", i), 25);
			r = appliquerCoup(st, "green", 0, 15, 10, false);
			assertRule(r.ok === true, "M: 2 blocs traversés");
			results.push("M. Plusieurs blocs traversés (pont 4 > 2 et 2)");

			/* --- N. Coup illégal : pion inexistant --- */
			st = freshState();
			r = appliquerCoup(st, "red", 99, 0, 6, true);
			assertRule(r.ok === false, "N: refusé");
			assertRule(r.error === "TOKEN_NOT_FOUND", "N: code erreur");
			results.push("N. Token inexistant");

			/* --- O. Coup illégal : déplacement depuis base sans 6 --- */
			st = freshState();
			r = appliquerCoup(st, "red", 0, 0, 4, false);
			assertRule(r.ok === false, "O: refusé");
			assertRule(r.error === "ILLEGAL_MOVE", "O: code erreur");
			results.push("O. Sortie base refusée sans 6");

			/* --- P. Cible différente de la destination calculée --- */
			st = freshState();
			r = appliquerCoup(st, "red", 0, 20, 6, true);
			assertRule(r.ok === false, "P: cible incohérente refusée");
			assertRule(r.error === "ILLEGAL_MOVE", "P: code erreur");
			assertRule(getToken(st, "red", 0).position === -1, "P: pion reste en base");
			results.push("P. Cible incohérente avec le dé refusée");

			return { ok: true, passed: results, failed: [] };
		} catch (error) {
			return { ok: false, passed: results, failed: error.message };
		}
	}

	/* ============================================================
	   EXPORTS
	   ============================================================ */

	return {
		appliquerCoup,
		runMoveSelfTests
	};
});
