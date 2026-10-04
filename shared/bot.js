/* ============================================================
   LUDO — INTELLIGENCE DES BOTS (navigateur + Node.js)
   ------------------------------------------------------------
   Ce fichier contient UNIQUEMENT l'analyse et la décision :
   - analyse d'un coup
   - notation pondérée
   - choix du meilleur coup

   Il ne contient AUCUNE orchestration : pas de timer, pas
   d'animation, pas de DOM, pas d'attente async.

   Toutes les fonctions qui lisent l'état reçoivent `state` en
   premier paramètre. Les règles sont importées depuis rules.js :
   aucune logique de règle n'est dupliquée ici.

   Chargement navigateur : voir index.html
	 constants.js → state.js → rules.js → bot.js → script.js

   Utilisation Node :
	 const Bot = require("./shared/bot.js");
   ============================================================ */

(function (root, factory) {
	if (typeof module === "object" && module.exports) {
		const constants = require("./constants.js");
		const rules = require("./rules.js");
		module.exports = factory(constants, rules);
	} else {
		root.LudoBot = factory(root.LudoConstants, root.LudoRules);
	}
})(typeof self !== "undefined" ? self : this, function (C, R) {
	"use strict";

	if (!C) throw new Error("shared/bot.js : constants.js doit être chargé avant.");
	if (!R) throw new Error("shared/bot.js : rules.js doit être chargé avant.");

	const {
		BOT_CONFIG,
		RULES,
		RING,
		FINISH_POSITION,
		FIRST_HOME_POSITION
	} = C;

	const {
		getLegalMoves,
		isLegalMove,
		getRingOccupants,
		getBlockAtRingIndex,
		pathIsBlocked,
		analyserCaseArrivee,
		isCommonPosition,
		getRingIndex,
		isSafeRingIndex,
		getToken,
		tokensOf
	} = R;

	/* ============================================================
	   LECTURE DE LA POSITION (aucune écriture)
	   ============================================================ */

	function alliesSurRing(state, color, ringIndex, saufTokenIndex) {
		return getRingOccupants(state, ringIndex).filter(t =>
			t.color === color && t.tokenIndex !== saufTokenIndex
		).length;
	}

	function adversairesDerriere(state, color, ringIndex, portee) {
		let total = 0;
		state.tokens.forEach(t => {
			if (t.color === color) return;
			if (!isCommonPosition(t.position)) return;
			const distance = (ringIndex - getRingIndex(t.color, t.position) + RING.length) % RING.length;
			if (distance >= 1 && distance <= portee) total += 1;
		});
		return total;
	}

	function ciblesAuProchainTour(state, color, position) {
		if (!isCommonPosition(position)) return 0;
		let cibles = 0;
		for (let d = 1; d <= 6; d++) {
			const suivante = position + d;
			if (suivante > C.LAST_COMMON_POSITION) break;
			const ring = getRingIndex(color, suivante);
			if (isSafeRingIndex(ring)) continue;
			if (pathIsBlocked(state, color, position, suivante)) break;
			if (getRingOccupants(state, ring).some(t => t.color !== color)) cibles += 1;
		}
		return cibles;
	}

	function risqueDeCapture(state, color, position, protegeParBlocage) {
		if (!isCommonPosition(position)) return 0;

		const ringIndex = getRingIndex(color, position);
		if (isSafeRingIndex(ringIndex)) return 0;
		if (protegeParBlocage) return 0;

		let menaces = 0;
		state.tokens.forEach(t => {
			if (t.color === color) return;
			if (!isCommonPosition(t.position)) return;

			const distance = (ringIndex - getRingIndex(t.color, t.position) + RING.length) % RING.length;
			if (distance < 1 || distance > 6) return;

			const cible = t.position + distance;
			if (cible > C.LAST_COMMON_POSITION) return;
			if (pathIsBlocked(state, t.color, t.position, cible)) return;

			menaces += 1;
		});

		return Math.min(menaces / 6, 1);
	}

	/* ============================================================
	   ANALYSE D'UN COUP
	   ============================================================ */

	function analyserCoupBot(state, color, move) {
		const token = getToken(state, color, move.tokenIndex);

		const analyse  = analyserCaseArrivee(state, color, move.to);
		const captures = analyse.estProtegee ? [] : analyse.adversaires;

		const surParcours = isCommonPosition(move.to);
		const ringCible   = surParcours ? getRingIndex(color, move.to) : null;

		const alliesCible  = surParcours ? alliesSurRing(state, color, ringCible, move.tokenIndex) : 0;
		const creeBlocage  = RULES.BLOCAGE_AVEC_2_PIONS && alliesCible >= 1;

		let casseBlocage = false;
		if (RULES.BLOCAGE_AVEC_2_PIONS && isCommonPosition(move.from)) {
			const blocDepart = getBlockAtRingIndex(state, getRingIndex(color, move.from));
			casseBlocage = !!(blocDepart && blocDepart.color === color && blocDepart.count === 2);
		}

		return {
			token: token,
			surParcours: surParcours,
			ringCible: ringCible,
			captures: captures,
			captureBloqueeParProtection: analyse.estProtegee && analyse.adversaires.length > 0,
			cibleSure: surParcours ? isSafeRingIndex(ringCible) : true,
			creeBlocage: creeBlocage,
			casseBlocage: casseBlocage,
			dangerCible:  risqueDeCapture(state, color, move.to, creeBlocage),
			dangerDepart: risqueDeCapture(state, color, move.from, false),
			ciblesFutures: ciblesAuProchainTour(state, color, move.to),
			quitteCaseSure: isCommonPosition(move.from)
				&& isSafeRingIndex(getRingIndex(color, move.from))
				&& surParcours && !isSafeRingIndex(ringCible),
			pionsEnBase:  tokensOf(state, color).filter(t => t.state === "BASE").length,
			pionsSurParcours: tokensOf(state, color).filter(t => t.state === "TRACK").length,
			adversairesDerriere: surParcours ? adversairesDerriere(state, color, ringCible, 12) : 0
		};
	}

	/* ============================================================
	   NOTATION D'UN COUP
	   ============================================================ */

	function scoreMove(state, color, move, level) {
		const config = BOT_CONFIG[level] || BOT_CONFIG.normal;
		const poids  = config.poids;
		const info   = analyserCoupBot(state, color, move);

		let score = 0;

		if (move.to === FINISH_POSITION) {
			score += poids.arrivee;
		} else if (move.to >= FIRST_HOME_POSITION) {
			score += poids.couloir + (move.to - FIRST_HOME_POSITION) * 3;
		}

		if (info.captures.length > 0) {
			score += poids.capture * info.captures.length;
			info.captures.forEach(victime => {
				score += poids.captureAvancee * Math.max(victime.position, 0);
			});
		}

		if (move.from === -1) {
			score += poids.sortieBase;
			if (info.pionsSurParcours === 0) score += poids.sortieUrgente;
			if (info.pionsEnBase >= 3)       score += poids.sortieUrgente * 0.5;
		} else {
			score += poids.progression * move.to;
			score += poids.avance * (move.to - move.from);
		}

		if (info.cibleSure && isCommonPosition(move.to)) score += poids.caseSure;

		if (info.creeBlocage) {
			score += poids.creerBlocage;
			score += poids.pression * info.adversairesDerriere;
		}

		if (info.casseBlocage) score -= poids.garderBlocage;

		score -= poids.danger * info.dangerCible;
		score += poids.fuite  * info.dangerDepart;

		score += poids.opportunite * info.ciblesFutures;

		if (info.quitteCaseSure && info.captures.length === 0 && !info.creeBlocage) {
			score -= poids.quitteCaseSure;
		}

		return score;
	}

	/* ============================================================
	   CHOIX DU COUP
	   ============================================================ */

	function chooseBotMove(state, color, diceValue, level) {
		const moves = getLegalMoves(state, color, diceValue);
		if (moves.length === 0) return null;
		if (moves.length === 1) return moves[0];

		const config = BOT_CONFIG[level] || BOT_CONFIG.normal;

		const notes = moves.map(move => ({
			move:  move,
			score: scoreMove(state, color, move, level),
			brut:  scoreMove(state, color, move, level)
		}));

		notes.forEach(n => { n.score += (Math.random() * 2 - 1) * config.jitter; });
		notes.sort((a, b) => b.score - a.score);

		const meilleur = notes[0].score;

		if (config.mistakeChance > 0
			&& meilleur < config.seuilCritique
			&& Math.random() < config.mistakeChance) {
			return notes[Math.floor(Math.random() * notes.length)].move;
		}

		const candidats = notes.filter(n => n.score >= meilleur - config.tolerance);
		if (candidats.length === 1) return candidats[0].move;

		const base = meilleur - config.tolerance;
		const poidsTirage = candidats.map(n => Math.pow(n.score - base + 1, 2));
		const total = poidsTirage.reduce((a, b) => a + b, 0);

		let tirage = Math.random() * total;
		for (let i = 0; i < candidats.length; i++) {
			tirage -= poidsTirage[i];
			if (tirage <= 0) return candidats[i].move;
		}
		return candidats[0].move;
	}

	/* ============================================================
	   EXPORTS
	   ============================================================ */

	return {
		alliesSurRing,
		adversairesDerriere,
		ciblesAuProchainTour,
		risqueDeCapture,
		analyserCoupBot,
		scoreMove,
		chooseBotMove
	};
});
