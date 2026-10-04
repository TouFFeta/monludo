/* ============================================================
   LUDO — ÉTAT DU JEU (navigateur + Node.js)
   ------------------------------------------------------------
   Ce fichier contient UNIQUEMENT la création et la structure
   de l'état logique du jeu. Il ne contient :
   - aucune fonction de règle (isLegalMove, pathIsBlocked, etc.)
   - aucun accès au DOM
   - aucune dépendance à un état mutable externe

   Chargement navigateur : voir index.html
	 <script src="shared/constants.js"></script>
	 <script src="shared/state.js"></script>   ← APRÈS constants
	 <script src="script.js"></script>          ← APRÈS state

   Utilisation Node :
	 const State = require("./shared/state.js");
   ============================================================ */

(function (root, factory) {
	if (typeof module === "object" && module.exports) {
		/* Node / CommonJS */
		const constants = require("./constants.js");
		module.exports = factory(constants);
	} else {
		/* Navigateur : dépend de window.LudoConstants (chargé avant). */
		root.LudoState = factory(root.LudoConstants);
	}
})(typeof self !== "undefined" ? self : this, function (C) {
	"use strict";

	if (!C) {
		throw new Error(
			"shared/state.js : shared/constants.js doit être chargé AVANT shared/state.js."
		);
	}

	const { TOKEN_STATE, PLAYER_ORDER, FINISH_POSITION, FIRST_HOME_POSITION } = C;


	/* ============================================================
	   ÉTAT D'UN PION À PARTIR DE SA POSITION LOGIQUE
	   ------------------------------------------------------------
	   -1       → BASE
	   0 → 50   → TRACK (parcours commun)
	   51 → 55  → HOME_PATH (couloir d'arrivée)
	   56       → FINISHED (centre)
	   ============================================================ */

	function stateFromPosition(position) {
		if (position === -1) return TOKEN_STATE.BASE;
		if (position === FINISH_POSITION) return TOKEN_STATE.FINISHED;
		if (position >= FIRST_HOME_POSITION) return TOKEN_STATE.HOME_PATH;
		return TOKEN_STATE.TRACK;
	}


	/* ============================================================
	   MUTATION D'UN PION
	   ------------------------------------------------------------
	   Primitive simple : écrit `position` sur le token fourni et
	   dérive `state` depuis cette position.
	   Ne touche à AUCUN état global.
	   Aucun effet de bord (pas de DOM, pas de timer, pas de log).
	   ============================================================ */

	function setTokenPosition(token, position) {
		token.position = position;
		token.state = stateFromPosition(position);
	}


	/* ============================================================
	   CRÉATION DES 16 PIONS
	   ------------------------------------------------------------
	   Un pion = un objet avec un id stable, une couleur immuable,
	   une position logique et un état dérivé.
	   ============================================================ */

	function createTokens() {
		const tokens = [];
		PLAYER_ORDER.forEach(color => {
			for (let i = 0; i < 4; i++) {
				tokens.push({
					id: color + "-" + i,
					color: color,
					player: color,
					tokenIndex: i,
					position: -1,
					state: TOKEN_STATE.BASE
				});
			}
		});
		return tokens;
	}


	/* ============================================================
	   ÉTAT INITIAL D'UNE PARTIE
	   ------------------------------------------------------------
	   Cet objet est la structure logique minimale. Les champs
	   isRolling / isAnimatingMove / isBotThinking sont conservés
	   pour compatibilité avec le code existant (ils sont utilisés
	   comme verrous UI côté client, mais font partie du même objet).
	   ============================================================ */

	function createInitialState() {
		return {
			currentPlayerIndex: 0,
			diceValue: null,
			diceRolled: false,
			isBotThinking: false,
			legalMoves: [],
			winner: null,
			isRolling: false,
			isAnimatingMove: false,
			consecutiveSixes: 0,
			lastRollWasSix: false,
			history: [],
			tokens: createTokens()
		};
	}


	/* ============================================================
	   EXPORTS
	   ============================================================ */

	return {
		stateFromPosition,
		setTokenPosition,
		createTokens,
		createInitialState
	};
});
