/* ============================================================
   LUDO — RÈGLES PARTAGÉES (navigateur + Node.js)
   ------------------------------------------------------------
   Ce fichier contient :
   - les helpers de géométrie pure (getRingIndex, isSafeRingIndex, ...)
   - les accès à l'état (getToken, tokensOf)
   - les règles de validation (isLegalMove, getLegalMoves, ...)

   Toutes les fonctions qui lisent l'état reçoivent `state` en
   premier paramètre. Aucune fonction ne touche au DOM.

   Chargement navigateur : voir index.html
	 <script src="shared/constants.js"></script>
	 <script src="shared/state.js"></script>
	 <script src="shared/rules.js"></script>
	 <script src="script.js"></script>

   Utilisation Node :
	 const Rules = require("./shared/rules.js");
   ============================================================ */

(function (root, factory) {
	if (typeof module === "object" && module.exports) {
		const constants = require("./constants.js");
		module.exports = factory(constants);
	} else {
		root.LudoRules = factory(root.LudoConstants);
	}
})(typeof self !== "undefined" ? self : this, function (C) {
	"use strict";

	if (!C) {
		throw new Error(
			"shared/rules.js : shared/constants.js doit être chargé AVANT shared/rules.js."
		);
	}

	const {
		RULES,
		RING,
		PLAYERS,
		PLAYER_ORDER,
		SAFE_RING_INDEXES,
		HOME_PATHS,
		LAST_COMMON_POSITION,
		FIRST_HOME_POSITION,
		FINISH_POSITION
	} = C;

	/* ============================================================
	   HELPERS DE GÉOMÉTRIE PURE
	   ------------------------------------------------------------
	   Aucune dépendance à un état mutable. Ne lisent que constants.
	   ============================================================ */

	function coordinateKey(row, col) { return row + "-" + col; }

	function isCommonPosition(position) {
		return position >= 0 && position <= LAST_COMMON_POSITION;
	}

	function getRingIndex(color, position) {
		if (!isCommonPosition(position)) return null;
		return (PLAYERS[color].offset + position) % RING.length;
	}

	function getLogicalCoordinate(color, position) {
		if (isCommonPosition(position)) return RING[getRingIndex(color, position)];
		if (position >= FIRST_HOME_POSITION && position < FINISH_POSITION) {
			return HOME_PATHS[color][position - FIRST_HOME_POSITION];
		}
		if (position === FINISH_POSITION) return [7, 7];
		return null;
	}

	function isSafeRingIndex(ringIndex) { return SAFE_RING_INDEXES.has(ringIndex); }

	function getTargetPosition(position, diceValue) {
		if (position === -1) return diceValue === 6 ? 0 : null;
		if (position === FINISH_POSITION) return null;
		const target = position + diceValue;
		if (target > FINISH_POSITION) return null;
		return target;
	}

	/* ============================================================
	   ACCÈS À L'ÉTAT
	   ------------------------------------------------------------
	   Petits helpers sans effet de bord.
	   ============================================================ */

	function tokensOf(state, color) {
		return state.tokens.filter(t => t.color === color);
	}

	function getToken(state, color, tokenIndex) {
		return state.tokens.find(t => t.color === color && t.tokenIndex === tokenIndex);
	}

	/* ============================================================
	   RÈGLES DE VALIDATION
	   ============================================================ */

	function getRingOccupants(state, ringIndex) {
		return state.tokens.filter(t =>
			isCommonPosition(t.position) && getRingIndex(t.color, t.position) === ringIndex
		);
	}

	function getBlockAtRingIndex(state, ringIndex) {
		if (!RULES.BLOCAGE_AVEC_2_PIONS) return null;
		const counts = {};
		getRingOccupants(state, ringIndex).forEach(t => {
			counts[t.color] = (counts[t.color] || 0) + 1;
		});
		for (const color of PLAYER_ORDER) {
			if ((counts[color] || 0) >= 2) return { color: color, count: counts[color] };
		}
		return null;
	}

	function tailleDePontSurPosition(state, color, position) {
		if (!isCommonPosition(position)) return 0;
		return getRingOccupants(state, getRingIndex(color, position))
			.filter(t => t.color === color).length;
	}

	function pathIsBlocked(state, color, fromPosition, toPosition) {
		if (!RULES.BLOCAGE_AVEC_2_PIONS) return false;
		const start = Math.max(fromPosition + 1, 0);
		const end   = Math.min(toPosition, LAST_COMMON_POSITION);

		const maTaille = RULES.PONT_PLUS_GRAND_TRAVERSE_BLOCAGE
			? tailleDePontSurPosition(state, color, fromPosition)
			: 0;

		for (let p = start; p <= end; p++) {
			const ringIndex = getRingIndex(color, p);
			const block = getBlockAtRingIndex(state, ringIndex);
			if (!block || block.color === color) continue;
			if (p === toPosition) return true;
			if (!RULES.PONT_PLUS_GRAND_TRAVERSE_BLOCAGE) return true;
			if (maTaille <= block.count) return true;
		}
		return false;
	}

	function analyserCaseArrivee(state, color, targetPosition) {
		if (!isCommonPosition(targetPosition)) {
			return { ringIndex: null, estProtegee: false, adversaires: [] };
		}
		const ringIndex = getRingIndex(color, targetPosition);
		return {
			ringIndex: ringIndex,
			estProtegee: isSafeRingIndex(ringIndex),
			adversaires: getRingOccupants(state, ringIndex).filter(t => t.color !== color)
		};
	}

	function isLegalMove(state, color, tokenIndex, diceValue) {
		if (!Number.isInteger(diceValue)) return false;
		const token = getToken(state, color, tokenIndex);
		if (!token) return false;

		const target = getTargetPosition(token.position, diceValue);
		if (target === null) return false;

		if (token.position === -1) {
			if (diceValue !== 6) return false;
			const block = getBlockAtRingIndex(state, PLAYERS[color].offset);
			if (block && block.color !== color) return false;
			return true;
		}

		if (pathIsBlocked(state, color, token.position, target)) return false;
		return true;
	}

	function getLegalMoves(state, color, diceValue) {
		const moves = [];
		tokensOf(state, color).forEach(token => {
			if (isLegalMove(state, color, token.tokenIndex, diceValue)) {
				moves.push({
					tokenIndex: token.tokenIndex,
					from: token.position,
					to: getTargetPosition(token.position, diceValue)
				});
			}
		});
		return moves;
	}

	function verifierVictoire(state, color) {
		return tokensOf(state, color).every(t => t.position === FINISH_POSITION);
	}

	function nombreArrives(state, color) {
		return tokensOf(state, color).filter(t => t.position === FINISH_POSITION).length;
	}

	/* ============================================================
	   EXPORTS
	   ============================================================ */

	return {
		/* Géométrie pure (mêmes signatures qu'avant) */
		coordinateKey,
		isCommonPosition,
		getRingIndex,
		getLogicalCoordinate,
		isSafeRingIndex,
		getTargetPosition,

		/* Accès à l'état (state-first) */
		tokensOf,
		getToken,

		/* Règles (state-first) */
		getRingOccupants,
		getBlockAtRingIndex,
		tailleDePontSurPosition,
		pathIsBlocked,
		analyserCaseArrivee,
		isLegalMove,
		getLegalMoves,
		verifierVictoire,
		nombreArrives
	};
});
