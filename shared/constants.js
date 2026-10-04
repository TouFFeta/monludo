/* ============================================================
   LUDO — CONSTANTES PARTAGÉES (navigateur + Node.js)
   ------------------------------------------------------------
   Ce fichier ne contient QUE des valeurs pures :
   - aucune fonction de jeu
   - aucun accès au DOM
   - aucune dépendance à gameState
   - aucune dépendance à un état mutable

   Chargement navigateur : voir index.html
   <script src="shared/constants.js?v=1"></script>
   AVANT <script src="script.js"></script>

   Utilisation Node :
   const C = require("./shared/constants.js");
   ============================================================ */

(function (root, factory) {
	if (typeof module === "object" && module.exports) {
		/* Node / CommonJS */
		module.exports = factory();
	} else {
		/* Navigateur : exposition via window.LudoConstants */
		root.LudoConstants = factory();
	}
})(typeof self !== "undefined" ? self : this, function () {
	"use strict";

	/* ============================================================
	   TYPES ET ÉTATS
	   ============================================================ */

	const TOKEN_STATE = {
		BASE: "BASE",
		TRACK: "TRACK",
		HOME_PATH: "HOME_PATH",
		FINISHED: "FINISHED"
	};

	const SEAT_TYPE = { HUMAN: "human", BOT: "bot", ONLINE: "online" };

	const BOT_LEVELS = { EASY: "easy", NORMAL: "normal", HARD: "hard" };


	/* ============================================================
	   RÈGLES ACTIVABLES
	   ============================================================ */

	const RULES = {
		/* --- VÉRIFIÉES sur sources officielles Ludo King --- */
		SORTIE_UNIQUEMENT_AVEC_6:        true,
		TOUR_SUPPLEMENTAIRE_SUR_6:       true,
		TOUR_SUPPLEMENTAIRE_SUR_CAPTURE: true,
		BLOCAGE_AVEC_2_PIONS:            true,
		ARRIVEE_NOMBRE_EXACT:            true,

		/* Trois 6 d'affilée : le TOUR passe au joueur suivant.
		   Cela ne fait JAMAIS perdre la partie, ne retire aucun pion
		   et n'annule aucun coup déjà joué. Seul le 3e lancer est perdu. */
		TROIS_6_TOUR_PERDU:              true,

		/* --- RÈGLES DE TON PROJET (choix assumés) --- */
		CASES_DEPART_SONT_SURES:         true,
		TOUR_SUPPLEMENTAIRE_SUR_ARRIVEE: true,
		GARDER_LA_MAIN_SI_6_SANS_COUP:   true,

		/* RÈGLE PROJET — un pont STRICTEMENT plus grand qu'un pont adverse
		   devant lui peut le TRAVERSER, à condition que le dé permette de
		   NE PAS s'y arrêter. Atterrir SUR un pont adverse reste TOUJOURS
		   interdit, quelle que soit la taille. */
		PONT_PLUS_GRAND_TRAVERSE_BLOCAGE: true
	};


	/* ============================================================
	   GÉOMÉTRIE DU PLATEAU
	   ============================================================ */

	const BOARD_SIZE = 15;

	const RING = [
		[6, 1], [6, 2], [6, 3], [6, 4], [6, 5],
		[5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6],
		[0, 7],
		[0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8],
		[6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14],
		[7, 14],
		[8, 14], [8, 13], [8, 12], [8, 11], [8, 10], [8, 9],
		[9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8],
		[14, 7],
		[14, 6], [13, 6], [12, 6], [11, 6], [10, 6], [9, 6],
		[8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0],
		[7, 0],
		[6, 0]
	];

	const STAR_RING_INDEXES = [8, 21, 34, 47];

	const HOME_PATHS = {
		red:    [[7, 1],  [7, 2],  [7, 3],  [7, 4],  [7, 5]],
		green:  [[1, 7],  [2, 7],  [3, 7],  [4, 7],  [5, 7]],
		blue:   [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]],
		yellow: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]]
	};

	const LAST_COMMON_POSITION = 50;
	const FIRST_HOME_POSITION  = 51;
	const FINISH_POSITION      = 56;

	const PLAYER_ORDER = ["red", "green", "blue", "yellow"];

	const PLAYERS = {
		red: {
			name: "Joueur rouge", shortName: "Rouge", letter: "R",
			offset: 0,  baseRow: 0, baseCol: 0, entryCell: [7, 0],  arrow: "right"
		},
		green: {
			name: "Joueur vert",  shortName: "Vert",  letter: "V",
			offset: 13, baseRow: 0, baseCol: 9, entryCell: [0, 7],  arrow: "down"
		},
		blue: {
			name: "Joueur bleu",  shortName: "Bleu",  letter: "B",
			offset: 26, baseRow: 9, baseCol: 9, entryCell: [7, 14], arrow: "left"
		},
		yellow: {
			name: "Joueur jaune", shortName: "Jaune", letter: "J",
			offset: 39, baseRow: 9, baseCol: 0, entryCell: [14, 7], arrow: "up"
		}
	};

	/* Index du parcours commun considérés comme cases sûres :
	   4 étoiles + (optionnel) les 4 cases de départ colorées. */
	const SAFE_RING_INDEXES = (function () {
		const set = new Set(STAR_RING_INDEXES);
		if (RULES.CASES_DEPART_SONT_SURES) {
			PLAYER_ORDER.forEach(color => set.add(PLAYERS[color].offset));
		}
		return set;
	})();

	const DICE_PIP_PATTERNS = {
		1: [5], 2: [1, 9], 3: [1, 5, 9],
		4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9]
	};


	/* ============================================================
	   BOT — PONDÉRATIONS PAR NIVEAU
	   ------------------------------------------------------------
	   tolerance     : écart de score accepté pour varier un peu
	   mistakeChance : probabilité d'une erreur « humaine »
	   seuilCritique : au-dessus, le bot ne se trompe jamais
	   ============================================================ */

	const BOT_CONFIG = {
		easy: {
			reflexionMin: 700, reflexionMax: 1200,
			tolerance: 28, jitter: 7, mistakeChance: 0.16, seuilCritique: 95,
			poids: {
				arrivee: 120, couloir: 14, capture: 55, captureAvancee: 0.15,
				sortieBase: 40, sortieUrgente: 22,
				progression: 0.10, avance: 1.2,
				caseSure: 0, creerBlocage: 0, garderBlocage: 0,
				danger: 0, fuite: 0, pression: 0,
				opportunite: 0, quitteCaseSure: 0
			}
		},
		normal: {
			reflexionMin: 750, reflexionMax: 1350,
			tolerance: 12, jitter: 4, mistakeChance: 0.05, seuilCritique: 90,
			poids: {
				arrivee: 130, couloir: 22, capture: 72, captureAvancee: 0.35,
				sortieBase: 44, sortieUrgente: 30,
				progression: 0.16, avance: 1.6,
				caseSure: 16, creerBlocage: 18, garderBlocage: 12,
				danger: 34, fuite: 26, pression: 3,
				opportunite: 5, quitteCaseSure: 8
			}
		},
		hard: {
			reflexionMin: 800, reflexionMax: 1500,
			tolerance: 5, jitter: 2, mistakeChance: 0, seuilCritique: 0,
			poids: {
				arrivee: 145, couloir: 30, capture: 85, captureAvancee: 0.55,
				sortieBase: 46, sortieUrgente: 38,
				progression: 0.22, avance: 1.8,
				caseSure: 22, creerBlocage: 28, garderBlocage: 20,
				danger: 46, fuite: 34, pression: 5,
				opportunite: 9, quitteCaseSure: 12
			}
		}
	};


	/* ============================================================
	   MODES DE JEU
	   ------------------------------------------------------------
	   Un "siège" = une couleur tenue soit par un humain, soit par
	   un bot. SEAT_TYPE.ONLINE est réservé pour le futur multijoueur.
	   ============================================================ */

	const GAME_MODES = {
		"solo": {
			id: "solo",
			label: "Solo — 1 joueur contre 3 bots",
			ranked: false,
			seats: { red: "human", green: "bot", blue: "bot", yellow: "bot" }
		},
		"four-players": {
			id: "four-players",
			label: "Partie locale à quatre joueurs",
			ranked: false,
			seats: {
				red:    SEAT_TYPE.HUMAN,
				green:  SEAT_TYPE.HUMAN,
				blue:   SEAT_TYPE.HUMAN,
				yellow: SEAT_TYPE.HUMAN
			}
		},
		"1v1": {
			id: "1v1",
			label: "1v1 — 2 joueurs + 2 bots",
			ranked: false,
			seats: {
				red:    SEAT_TYPE.HUMAN,
				green:  SEAT_TYPE.BOT,
				blue:   SEAT_TYPE.HUMAN,
				yellow: SEAT_TYPE.BOT
			}
		},
		"1v1-ranked": {
			id: "1v1-ranked",
			label: "1v1 Classé — 2 joueurs + 2 bots",
			ranked: true,
			seats: {
				red:    SEAT_TYPE.HUMAN,
				green:  SEAT_TYPE.BOT,
				blue:   SEAT_TYPE.HUMAN,
				yellow: SEAT_TYPE.BOT
			}
		}
	};


	/* ============================================================
	   EXPORTS
	   ============================================================ */

	return {
		TOKEN_STATE,
		SEAT_TYPE,
		BOT_LEVELS,
		RULES,
		BOARD_SIZE,
		RING,
		STAR_RING_INDEXES,
		HOME_PATHS,
		LAST_COMMON_POSITION,
		FIRST_HOME_POSITION,
		FINISH_POSITION,
		PLAYER_ORDER,
		PLAYERS,
		SAFE_RING_INDEXES,
		DICE_PIP_PATTERNS,
		BOT_CONFIG,
		GAME_MODES
	};
});
