/* ============================================================
   LUDO — MOTEUR DE JEU LOCAL (4 joueurs sur le même appareil)

   ARCHITECTURE (ne jamais inverser cet ordre) :
   ÉTAT LOGIQUE → RÈGLES → VALIDATION → ANIMATION → AFFICHAGE

   Le moteur est la SEULE source de vérité.
   Aucune position n'est décidée par le CSS ou par une animation.
   ============================================================ */


/* ============================================================
    CONSTANTES PARTAGÉES
    ------------------------------------------------------------
    shared/constants.js est chargé AVANT ce fichier (voir index.html).
    Il expose window.LudoConstants. Toutes les constantes pures
    du jeu proviennent de là — source unique de vérité.
    ============================================================ */

const {
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
} = window.LudoConstants;

/* ============================================================
   ÉTAT DU JEU PARTAGÉ
   ------------------------------------------------------------
   shared/state.js est chargé APRÈS shared/constants.js
   et AVANT script.js (voir index.html).
   Il expose window.LudoState.
   ============================================================ */

const {
    stateFromPosition,
    setTokenPosition,
    createTokens,
    createInitialState
} = window.LudoState;

/* ============================================================
   RÈGLES PARTAGÉES
   ------------------------------------------------------------
   shared/rules.js est chargé APRÈS constants.js et state.js.
   Les fonctions pures gardent leur signature.
   Les fonctions qui lisent l'état prennent `state` en premier
   paramètre dans rules.js ; ici, de petits wrappers réinjectent
   gameState pour conserver les appels existants inchangés.
   ============================================================ */

const Rules = window.LudoRules;

/* --- Fonctions pures : signatures identiques à avant --- */
const {
    coordinateKey,
    isCommonPosition,
    getRingIndex,
    getLogicalCoordinate,
    isSafeRingIndex,
    getTargetPosition
} = Rules;

/* --- Wrappers de compatibilité (délèguent à rules.js) --- */
function tokensOf(color)                { return Rules.tokensOf(gameState, color); }
function getToken(color, tokenIndex)    { return Rules.getToken(gameState, color, tokenIndex); }
function getRingOccupants(ringIndex)    { return Rules.getRingOccupants(gameState, ringIndex); }
function getBlockAtRingIndex(ringIndex) { return Rules.getBlockAtRingIndex(gameState, ringIndex); }
function tailleDePontSurPosition(c, p)  { return Rules.tailleDePontSurPosition(gameState, c, p); }
function pathIsBlocked(c, from, to)     { return Rules.pathIsBlocked(gameState, c, from, to); }
function analyserCaseArrivee(c, t)      { return Rules.analyserCaseArrivee(gameState, c, t); }
function isLegalMove(c, idx, dv)        { return Rules.isLegalMove(gameState, c, idx, dv); }
function getLegalMoves(c, dv)           { return Rules.getLegalMoves(gameState, c, dv); }
function verifierVictoire(color)        { return Rules.verifierVictoire(gameState, color); }
function nombreArrives(c)               { return Rules.nombreArrives(gameState, c); }

/* ============================================================
   INTELLIGENCE DES BOTS (module partagé)
   ------------------------------------------------------------
   shared/bot.js contient l'analyse et la décision pures.
   Ci-dessous, de petits wrappers réinjectent `gameState` pour
   que les appelants existants (executeBotTurn, tests) restent
   inchangés.
   ============================================================ */

const Bot = window.LudoBot;

function alliesSurRing(color, ringIndex, saufTokenIndex) {
    return Bot.alliesSurRing(gameState, color, ringIndex, saufTokenIndex);
}
function adversairesDerriere(color, ringIndex, portee) {
    return Bot.adversairesDerriere(gameState, color, ringIndex, portee);
}
function ciblesAuProchainTour(color, position) {
    return Bot.ciblesAuProchainTour(gameState, color, position);
}
function risqueDeCapture(color, position, protegeParBlocage) {
    return Bot.risqueDeCapture(gameState, color, position, protegeParBlocage);
}
function analyserCoupBot(color, move) {
    return Bot.analyserCoupBot(gameState, color, move);
}
function scoreMove(color, move, level) {
    return Bot.scoreMove(gameState, color, move, level);
}
function chooseBotMove(color, diceValue, level) {
    return Bot.chooseBotMove(gameState, color, diceValue, level);
}

/* ============================================================
   MOTEUR DE COUP (module partagé)
   ------------------------------------------------------------
   shared/move.js est chargé APRÈS bot.js (voir index.html).
   Il expose appliquerCoup(), utilisée par deplacerPion().
   ============================================================ */

const { appliquerCoup } = window.LudoMove;


/* ============================================================
    0. RÈGLES ACTIVÉES
    ============================================================ */

/* RULES est définie dans shared/constants.js (voir bloc d'import en haut). */


/* ============================================================
   1. ÉLÉMENTS DE L'INTERFACE
   ============================================================ */

const homeScreen       = document.getElementById("homeScreen");
const gameScreen       = document.getElementById("gameScreen");
const playNowButton    = document.getElementById("playNowButton");
const backHomeButton   = document.getElementById("backHomeButton");
const brandHome        = document.getElementById("brandHome");

const navHome          = document.getElementById("navHome");
const navPlay          = document.getElementById("navPlay");
const navRanking       = document.getElementById("navRanking");
const navEvents        = document.getElementById("navEvents");
const navShop          = document.getElementById("navShop");
const navLogin         = document.getElementById("navLogin");
const navProfile       = document.getElementById("navProfile");
const navNotifications = document.getElementById("navNotifications");

const modeButtons      = document.querySelectorAll(".mode-button[data-mode]");
const botLevelButtons  = document.querySelectorAll(".bot-level-button");

const ludoBoard        = document.getElementById("ludoBoard");
const diceButton       = document.getElementById("diceButton");
const diceButtonLabel  = diceButton ? diceButton.querySelector(".dice-button-label") : null;
const diceCube         = document.getElementById("diceCube");
const diceValueText    = document.getElementById("diceValueText");
const diceMessage      = document.getElementById("diceMessage");
const lastResultValue  = document.getElementById("lastResultValue");
const restartButton    = document.getElementById("restartButton");
const newGameButton    = document.getElementById("newGameButton");
const gameModeLabel    = document.getElementById("gameModeLabel");
const toast            = document.getElementById("toast");
const turnBonus        = document.getElementById("turnBonus");
const turnCard         = document.querySelector(".turn-card");

const turnColorIndicator = document.querySelector(".turn-color-indicator");
const playerAvatar       = document.querySelector(".player-avatar");
const playerInfoStrong   = document.querySelector(".player-info strong");
const playerInfoSmall    = document.querySelector(".player-info small");
const playerRows         = document.querySelectorAll(".players-card .player-row");

const historyList      = document.getElementById("historyList");
const historyCount     = document.getElementById("historyCount");

const soundButton      = document.getElementById("soundButton");
const settingsButton   = document.getElementById("settingsButton");
const helpButton       = document.getElementById("helpButton");

const winnerOverlay     = document.getElementById("winnerOverlay");
const winnerName        = document.getElementById("winnerName");
const winnerColorDot    = document.getElementById("winnerColorDot");
const playAgainButton   = document.getElementById("playAgainButton");
const backToHomeFromWin = document.getElementById("backToHomeFromWin");


/* ============================================================
   2. DURÉES D'ANIMATION
   ============================================================ */

/* Géométrie, couleurs et règles : voir shared/constants.js.
    Seules les durées d'animation restent ici (client uniquement). */

/* Durées d'animation (ms) */
const DICE_ANIMATION_MS = 850;   /* roulement du dé          */
const MOVE_STEP_MS      = 110;   /* glissement d'une case    */
const BASE_EXIT_MS      = 340;   /* sortie de base           */
const CAPTURE_RETURN_MS = 430;   /* retour du pion capturé   */
const ARRIVAL_MS        = 380;   /* petit saut à l'arrivée   */


/* ============================================================
   3. ÉTAT LOGIQUE + IDENTITÉ DES PIONS
   ============================================================ */

let gameState = null;

/* Identifiant de la partie en cours.
   Chaque nouvelle partie l'incrémente : toute animation ou tout
   déplacement lancé par une partie précédente s'interrompt aussitôt. */
let partieId = 0;

function partieActive(id) { return id === partieId; }

/* stateFromPosition, createTokens, createInitialState
    → voir shared/state.js */

function currentPlayerColor() { return PLAYER_ORDER[gameState.currentPlayerIndex]; }

/* tokensOf, getToken : voir shared/rules.js (via wrappers locaux en haut). */

/* setTokenPosition : voir shared/state.js (primitive de mutation). */


/* ============================================================
   4. COORDONNÉES
   ============================================================ */

/* Helpers géométriques : voir shared/rules.js */


/* ============================================================
   5. RÈGLES
   ============================================================ */

/* getRingOccupants, getBlockAtRingIndex, pathIsBlocked,
   getTargetPosition, isLegalMove, getLegalMoves :
   voir shared/rules.js (via wrappers locaux en haut du fichier). */


/* ============================================================
   6. CASE PROTÉGÉE ET CAPTURE
   ------------------------------------------------------------
   Le moteur analyse TOUJOURS la case d'arrivée avant de décider
   d'une capture. Sur une case protégée : aucune capture, aucun
   retour en base, aucune animation de capture.
   ============================================================ */

/* Exécute la capture UNIQUEMENT si la case n'est pas protégée.
   Renvoie { captures: [...], captureBloqueeParProtection: bool }. */
function resoudreCapture(color, targetPosition) {
    const analyse = analyserCaseArrivee(color, targetPosition);   // lecture pure

    if (analyse.adversaires.length === 0) {
        return { captures: [], captureBloqueeParProtection: false, analyse };
    }
    if (analyse.estProtegee) {
        return { captures: [], captureBloqueeParProtection: true, analyse };
    }

    analyse.adversaires.forEach(victim => setTokenPosition(victim, -1));  // MUTATION
    return { captures: analyse.adversaires, captureBloqueeParProtection: false, analyse };
}


/* ============================================================
   7. VICTOIRE
   ============================================================ */

/* verifierVictoire, nombreArrives : voir shared/rules.js. */

/* ============================================================
   8. NOTIFICATIONS ET FEEDBACK
   ============================================================ */

let toastTimer;
function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}

function setGameMessage(message) {
    if (diceMessage) diceMessage.textContent = message;
}

let bonusTimer;
function showBonusBadge(message) {
    if (!turnBonus) return;
    turnBonus.textContent = message;
    turnBonus.hidden = false;
    turnBonus.classList.remove("show");
    void turnBonus.offsetWidth;
    turnBonus.classList.add("show");
    if (turnCard) {
        turnCard.classList.remove("bonus-flash");
        void turnCard.offsetWidth;
        turnCard.classList.add("bonus-flash");
    }
    clearTimeout(bonusTimer);
    bonusTimer = setTimeout(hideBonusBadge, 2400);
}

function hideBonusBadge() {
    if (!turnBonus) return;
    turnBonus.classList.remove("show");
    turnBonus.hidden = true;
    if (turnCard) turnCard.classList.remove("bonus-flash");
}


/* ============================================================
   9. HISTORIQUE
   ============================================================ */

function addHistoryEntry(color, text) {
    gameState.history.push({ color: color, text: text });
    if (gameState.history.length > 60) gameState.history.shift();
    renderHistory();
}

function renderHistory() {
    if (!historyList) return;

    if (gameState.history.length === 0) {
        historyList.innerHTML = '<div class="history-empty">Aucun événement.</div>';
    } else {
        historyList.innerHTML = gameState.history.map(entry =>
            '<div class="history-entry">' +
                '<span class="history-entry-dot ' + entry.color + '"></span>' +
                '<span class="history-entry-text">' + entry.text + '</span>' +
            '</div>'
        ).join("");
    }

    if (historyCount) historyCount.textContent = gameState.history.length;
    historyList.scrollTop = historyList.scrollHeight;
}


/* ============================================================
   10. PANNEAU JOUEUR / TOUR
   ============================================================ */

function updatePlayerPanel() {
    const color  = currentPlayerColor();
    const player = PLAYERS[color];

    const cestUnBot = estBot(color);

    if (turnColorIndicator) turnColorIndicator.className = "turn-color-indicator " + color;
    if (playerAvatar) {
        playerAvatar.className = "player-avatar " + color + (cestUnBot ? " bot" : "");
        playerAvatar.textContent = cestUnBot ? "🤖" : player.letter;
    }
    if (playerInfoStrong) playerInfoStrong.textContent = nomComplet(color);
    if (playerInfoSmall) {
        playerInfoSmall.textContent = gameState.winner
            ? "Partie terminée"
            : (cestUnBot ? "Tour du bot" : "À toi de jouer");
    }

    playerRows.forEach(row => {
        const rowColor = row.dataset.color;
        if (!rowColor || !PLAYERS[rowColor]) return;

        row.classList.toggle("active-player", rowColor === color && !gameState.winner);

        const nameElement  = row.querySelector(".player-name");
        const stateElement = row.querySelector(".player-state");
        const dotElement   = row.querySelector(".player-color");

        /* Une seule source de vérité : PLAYERS[rowColor] + les sièges du mode. */
        if (nameElement) {
            nameElement.innerHTML = nomComplet(rowColor)
                + (estBot(rowColor) ? ' <span class="bot-tag">BOT</span>' : '');
        }
        if (dotElement)  dotElement.className = "player-color " + rowColor;
        if (stateElement) {
            const arrived = nombreArrives(rowColor);
            if (gameState.winner === rowColor)  stateElement.textContent = "Gagnant";
            else if (rowColor === color)        stateElement.textContent = arrived + "/4 · Ton tour";
            else                                stateElement.textContent = arrived + "/4";
        }
    });
}

/* NOTE : cette fonction peut réécrire le message du dé.
   Toujours l'appeler AVANT un setGameMessage() personnalisé. */
function updateActionPanel() {
    if (!diceButton || !diceButtonLabel) return;
    const color = currentPlayerColor();

    if (gameState.winner) {
        diceButton.disabled = true;
        diceButtonLabel.textContent = "PARTIE TERMINÉE";
        return;
    }

    const cestUnBot = estBot(color);

    /* Pendant tout le tour d'un bot, l'humain ne peut RIEN déclencher. */
    diceButton.disabled = cestUnBot || gameState.isBotThinking
        || gameState.isRolling || gameState.isAnimatingMove || gameState.diceRolled;

    if (cestUnBot) {
        diceButtonLabel.textContent = "TOUR DU BOT";
    } else {
        diceButtonLabel.textContent = gameState.diceRolled ? "CHOISIR UN PION" : "LANCER LE DÉ";
    }

    if (cestUnBot) {
        /* Le message précis est écrit par executeBotTurn(). */
        return;
    }

    if (gameState.diceRolled) {
        const count = gameState.legalMoves.length;
        if (count === 1)    setGameMessage("Choisis le pion mis en évidence.");
        else if (count > 1) setGameMessage("Choisis un pion à déplacer.");
    } else if (!gameState.isRolling && !gameState.isAnimatingMove) {
        setGameMessage("Au tour du " + PLAYERS[color].name.toLowerCase() + ". Lance le dé.");
    }
}


/* ============================================================
   11. CONSTRUCTION DU PLATEAU
   ============================================================ */

function findRingIndexByCoordinate(row, col) {
    return RING.findIndex(coordinate => coordinate[0] === row && coordinate[1] === col);
}

function findHomePathByCoordinate(row, col) {
    for (const color of PLAYER_ORDER) {
        const index = HOME_PATHS[color].findIndex(c => c[0] === row && c[1] === col);
        if (index !== -1) return { color: color, index: index };
    }
    return null;
}

function isInsideBase(row, col) {
    return PLAYER_ORDER.some(color => {
        const p = PLAYERS[color];
        return row >= p.baseRow && row < p.baseRow + 6
            && col >= p.baseCol && col < p.baseCol + 6;
    });
}

function createBoardCell(row, col) {
    const cell = document.createElement("div");
    cell.className = "board-cell";
    cell.style.gridRow    = String(row + 1);
    cell.style.gridColumn = String(col + 1);
    cell.dataset.row = row;
    cell.dataset.col = col;

    if (isInsideBase(row, col)) {
        cell.classList.add("base-cell");
        return cell;
    }

    /* Centre 3 × 3 : dessiné par un calque dédié (createCenterGoal). */
    if (row >= 6 && row <= 8 && col >= 6 && col <= 8) {
        cell.classList.add("center-cell");
        return cell;
    }

    const ringIndex = findRingIndexByCoordinate(row, col);
    if (ringIndex !== -1) {
        cell.classList.add("track");
        cell.dataset.ringIndex = ringIndex;

        if (isSafeRingIndex(ringIndex)) cell.classList.add("safe");
        if (STAR_RING_INDEXES.indexOf(ringIndex) !== -1) cell.classList.add("star");

        PLAYER_ORDER.forEach(color => {
            if (ringIndex === PLAYERS[color].offset) {
                cell.classList.add("start-cell", "start-" + color);
                cell.dataset.startColor = color;
            }
            const entry = PLAYERS[color].entryCell;
            if (entry[0] === row && entry[1] === col) {
                cell.classList.add("entry-cell", "entry-" + color, "arrow-" + PLAYERS[color].arrow);
                cell.dataset.entryColor = color;
            }
        });
        return cell;
    }

    const home = findHomePathByCoordinate(row, col);
    if (home) {
        cell.classList.add("home-path", "home-path-" + home.color);
        cell.dataset.homeColor = home.color;
        cell.dataset.homeIndex = home.index;
    }
    return cell;
}

function createHomeZone(color) {
    const player = PLAYERS[color];

    const zone = document.createElement("div");
    zone.className = "home-zone " + color;
    zone.style.gridRow    = (player.baseRow + 1) + " / span 6";
    zone.style.gridColumn = (player.baseCol + 1) + " / span 6";

    const inner = document.createElement("div");
    inner.className = "home-zone-inner";

    for (let i = 0; i < 4; i++) {
        const slot = document.createElement("div");
        slot.className = "home-slot";
        slot.dataset.homeColor  = color;
        slot.dataset.tokenIndex = i;
        inner.appendChild(slot);
    }

    zone.appendChild(inner);
    ludoBoard.appendChild(zone);
}

function createCenterGoal() {
    const goal = document.createElement("div");
    goal.className = "center-goal";
    goal.style.gridRow    = "7 / span 3";
    goal.style.gridColumn = "7 / span 3";

    PLAYER_ORDER.forEach(color => {
        const triangle = document.createElement("div");
        triangle.className = "goal-triangle " + color;
        goal.appendChild(triangle);
    });

    PLAYER_ORDER.forEach(color => {
        const slot = document.createElement("div");
        slot.className = "finish-slot finish-" + color;
        slot.dataset.finishColor = color;
        goal.appendChild(slot);
    });

    ludoBoard.appendChild(goal);
}

function createBoard() {
    if (!ludoBoard) {
        console.error("LUDO : élément #ludoBoard introuvable dans index.html.");
        return;
    }
    ludoBoard.innerHTML = "";

    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            ludoBoard.appendChild(createBoardCell(row, col));
        }
    }

    PLAYER_ORDER.forEach(createHomeZone);
    createCenterGoal();
    renderTokens();
}


/* ============================================================
   12. RENDU DES PIONS
   ------------------------------------------------------------
   Structure d'un pion :
     <div class="game-token">   ← position (glissement FLIP)
        <span class="token">    ← visuel (pulsation, impact, saut)
   ============================================================ */

function findBoardCell(row, col) {
    return ludoBoard.querySelector('.board-cell[data-row="' + row + '"][data-col="' + col + '"]');
}

function createTokenElement(token) {
    const element = document.createElement("div");
    element.className = "game-token";
    element.tabIndex = 0;
    element.setAttribute("role", "button");
    element.setAttribute("aria-label",
        "Pion " + (token.tokenIndex + 1) + " du " + PLAYERS[token.color].name.toLowerCase());
    element.dataset.color      = token.color;
    element.dataset.tokenIndex = token.tokenIndex;
    element.dataset.tokenId    = token.id;

    const body = document.createElement("span");
    body.className = "token " + token.color;
    element.appendChild(body);

    element.addEventListener("click", function () {
        handleTokenSelection(token.color, token.tokenIndex);
    });
    element.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            handleTokenSelection(token.color, token.tokenIndex);
        }
    });
    return element;
}

/* Renvoie le conteneur DOM correspondant EXACTEMENT à la position logique. */
function getTokenContainer(token) {
    if (token.position === -1) {
        return ludoBoard.querySelector(
            '.home-slot[data-home-color="' + token.color + '"]' +
            '[data-token-index="' + token.tokenIndex + '"]'
        );
    }
    if (token.position === FINISH_POSITION) {
        return ludoBoard.querySelector('.finish-slot[data-finish-color="' + token.color + '"]');
    }
    const coordinate = getLogicalCoordinate(token.color, token.position);
    if (!coordinate) return null;
    return findBoardCell(coordinate[0], coordinate[1]);
}

function renderTokens() {
    if (!ludoBoard) return;

    ludoBoard.querySelectorAll(".game-token").forEach(el => el.remove());
    ludoBoard.querySelectorAll(".block-marker").forEach(el => el.remove());
    ludoBoard.querySelectorAll(".has-block").forEach(el => el.classList.remove("has-block"));
    ludoBoard.querySelectorAll(".occupied-slot").forEach(el => el.classList.remove("occupied-slot"));

    const groups = new Map();

    gameState.tokens.forEach(token => {
        const container = getTokenContainer(token);
        if (!container) return;

        const element = createTokenElement(token);
        if (token.state === TOKEN_STATE.FINISHED) {
            element.querySelector(".token").classList.add("finished-token");
        }
        if (token.state === TOKEN_STATE.BASE) container.classList.add("occupied-slot");

        if (!groups.has(container)) groups.set(container, []);
        groups.get(container).push(element);
    });

    groups.forEach(function (elements, container) {
        elements.forEach(function (element, index) {
            element.dataset.stackIndex = index;
            element.dataset.stackSize  = elements.length;
            if (elements.length > 1) {
                element.classList.add("stacked-token");
                element.style.setProperty("--stack-index", index);
                element.style.setProperty("--stack-size", elements.length);
            }
            container.appendChild(element);
        });

        if (container.dataset && container.dataset.ringIndex !== undefined) {
            const block = getBlockAtRingIndex(Number(container.dataset.ringIndex));
            if (block) {
                container.classList.add("has-block");
                const marker = document.createElement("span");
                marker.className = "block-marker " + block.color;
                marker.textContent = "×" + block.count;
                container.appendChild(marker);
            }
        }
    });

    updateLegalMoveHighlights();
}


/* ============================================================
   13. MOTEUR D'ANIMATION (technique FLIP)
   ------------------------------------------------------------
   1. on mémorise la position à l'écran de chaque pion
   2. le MOTEUR change la position logique
   3. on redessine
   4. on remet visuellement le pion à son ancienne place
      puis on le laisse glisser jusqu'à la nouvelle.

   L'animation ne modifie JAMAIS l'état logique.
   ============================================================ */

function prefersReducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

/* Étape 1 : mémoriser où se trouve chaque pion à l'écran. */
function captureTokenRects() {
    const rects = new Map();
    if (!ludoBoard) return rects;
    ludoBoard.querySelectorAll(".game-token").forEach(element => {
        const rect = element.getBoundingClientRect();
        if (rect.width > 0) rects.set(element.dataset.tokenId, rect);
    });
    return rects;
}

/* Étape 4 : faire glisser les pions qui ont changé de case. */
function playFlip(previousRects, duration) {
    if (!ludoBoard || !previousRects || previousRects.size === 0) return false;
    if (prefersReducedMotion()) return false;

    const moved = [];
    ludoBoard.querySelectorAll(".game-token").forEach(element => {
        const before = previousRects.get(element.dataset.tokenId);
        if (!before) return;
        const after = element.getBoundingClientRect();
        if (after.width === 0) return;

        const dx = before.left - after.left;
        const dy = before.top  - after.top;
        if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;

        element.style.transition = "none";
        element.style.transform  = "translate(" + dx + "px, " + dy + "px)";
        moved.push(element);
    });

    if (moved.length === 0) return false;

    void ludoBoard.offsetWidth;   /* force le navigateur à prendre en compte l'état de départ */

    moved.forEach(element => {
        element.style.transition = "transform " + duration + "ms cubic-bezier(0.32, 1.12, 0.42, 1)";
        element.style.transform  = "translate(0px, 0px)";
        element.classList.add("is-sliding");
    });
    return true;
}

/* Petite animation sur le visuel d'un pion (impact, saut, atterrissage). */
function animateTokenBody(color, tokenIndex, className, duration) {
    if (!ludoBoard || prefersReducedMotion()) return;
    const body = ludoBoard.querySelector(
        '.game-token[data-color="' + color + '"][data-token-index="' + tokenIndex + '"] .token'
    );
    if (!body) return;
    body.classList.remove(className);
    void body.offsetWidth;
    body.classList.add(className);
    setTimeout(function () { body.classList.remove(className); }, duration);
}


/* ============================================================
   14. SURBRILLANCE DES COUPS LÉGAUX
   ============================================================ */

function updateLegalMoveHighlights() {
    if (!ludoBoard) return;
    ludoBoard.querySelectorAll(".game-token").forEach(el => el.classList.remove("legal-move"));
    if (!gameState.diceRolled || gameState.winner) return;

    const color = currentPlayerColor();
    gameState.legalMoves.forEach(move => {
        const element = ludoBoard.querySelector(
            '.game-token[data-color="' + color + '"][data-token-index="' + move.tokenIndex + '"]'
        );
        if (element) element.classList.add("legal-move");
    });
}

function handleTokenSelection(color, tokenIndex) {
    if (!gameState || gameState.winner) return;
    if (gameState.isRolling || gameState.isAnimatingMove || gameState.isBotThinking) return;

    if (estBot(currentPlayerColor())) {
        showToast("Le bot est en train de jouer.");
        return;
    }
    if (color !== currentPlayerColor()) {
        showToast("Ce n'est pas le tour de ce joueur.");
        return;
    }
    if (!gameState.diceRolled) {
        showToast("Lance d'abord le dé.");
        return;
    }

    const move = gameState.legalMoves.find(m => m.tokenIndex === tokenIndex);
    if (!move) {
        showToast("Ce pion ne peut pas être déplacé avec ce résultat.");
        return;
    }

    animateTokenBody(color, tokenIndex, "picked", 220);
    deplacerPion(color, tokenIndex, move.to);
}


/* ============================================================
   15. DÉPLACEMENT (case par case, avec glissement)
   ============================================================ */

function getMovementPath(fromPosition, toPosition) {
    if (fromPosition === -1) return [0];
    const path = [];
    for (let p = fromPosition + 1; p <= toPosition; p++) path.push(p);
    return path;
}

async function animateTokenMovement(token, fromPosition, toPosition, idPartie) {
    const path = getMovementPath(fromPosition, toPosition);

    if (prefersReducedMotion()) {
        setTokenPosition(token, toPosition);
        renderTokens();
        return;
    }

    /* Sortie de base : un seul grand glissement + atterrissage. */
    if (fromPosition === -1) {
        const before = captureTokenRects();
        setTokenPosition(token, 0);
        renderTokens();
        playFlip(before, BASE_EXIT_MS);
        animateTokenBody(token.color, token.tokenIndex, "exiting-base", BASE_EXIT_MS);
        await sleep(BASE_EXIT_MS);
        if (!partieActive(idPartie)) return;
        animateTokenBody(token.color, token.tokenIndex, "landing", 260);
        await sleep(160);
        return;
    }

    /* Déplacement normal : une case à la fois, chacune animée. */
    for (const position of path) {
        if (!partieActive(idPartie)) return;
        const before = captureTokenRects();
        setTokenPosition(token, position);
        renderTokens();
        playFlip(before, MOVE_STEP_MS);
        animateTokenBody(token.color, token.tokenIndex, "hopping", MOVE_STEP_MS);
        await sleep(MOVE_STEP_MS);
    }
}

async function deplacerPion(color, tokenIndex, targetPosition) {
    if (!gameState || gameState.winner) return;

    const token = getToken(color, tokenIndex);
    if (!token) return;

    /* Dernière validation avant toute animation (garde UI). */
    if (!isLegalMove(color, tokenIndex, gameState.diceValue)) return;

    /* Toute la suite appartient à CETTE partie et à aucune autre. */
    const idPartie = partieId;
    const fromPosition = token.position;
    const diceValue    = gameState.diceValue;
    const rolledSix    = gameState.lastRollWasSix;

    gameState.isAnimatingMove = true;
    gameState.legalMoves = [];
    hideBonusBadge();
    updateActionPanel();
    updateLegalMoveHighlights();

    /* --- Animation du déplacement (mute token.position case par case) --- */
    await animateTokenMovement(token, fromPosition, targetPosition, idPartie);
    if (!partieActive(idPartie)) return;

    /* --- Historique du déplacement --- */
    if (fromPosition === -1) {
        addHistoryEntry(color, "<strong>" + nomCourt(color) + "</strong> sort un pion");
    } else if (targetPosition === FINISH_POSITION) {
        addHistoryEntry(color, "<strong>" + nomCourt(color) + "</strong> amène un pion à l'arrivée");
    } else {
        addHistoryEntry(color, "<strong>" + nomCourt(color) + "</strong> avance de " + diceValue);
    }

    /* --- Application logique du coup (source de vérité unique) ---
       L'animation a déjà placé le token à targetPosition. On le
       repositionne temporairement à fromPosition (sans render, donc
       sans impact visuel) pour qu'appliquerCoup() valide et rejoue
       la mutation complète : déplacement, captures, arrivée, victoire. */
    setTokenPosition(token, fromPosition);

    const result = appliquerCoup(
        gameState, color, tokenIndex, targetPosition, diceValue, rolledSix
    );

    if (!result.ok) {
        /* Défensif : ne devrait jamais arriver — on a pré-validé. */
        console.error("LUDO — appliquerCoup a refusé un coup pré-validé :", result);
        gameState.isAnimatingMove = false;
        gameState.diceRolled = false;
        gameState.diceValue  = null;
        renderTokens();
        return;
    }

    /* --- 5. Capture : retour visuel des victimes --- */
    if (result.captureBlocked) {
        addHistoryEntry(color,
            "<strong>" + nomCourt(color) + "</strong> tente une capture sur case protégée");
        showToast("Case protégée : capture impossible.");
        animateTokenBody(color, tokenIndex, "shielded", 500);
        await sleep(420);
        if (!partieActive(idPartie)) return;
    }

    if (result.captures.length > 0) {
        animateTokenBody(color, tokenIndex, "hit", 300);
        const before = captureTokenRects();
        renderTokens();
        playFlip(before, CAPTURE_RETURN_MS);
        result.captures.forEach(victim => {
            animateTokenBody(victim.color, victim.tokenIndex, "captured", CAPTURE_RETURN_MS);
            addHistoryEntry(color, "<strong>" + nomCourt(color) + "</strong> capture un pion "
                + PLAYERS[victim.color].shortName.toLowerCase());
        });
        showToast(nomComplet(color) + " capture " + result.captures.length + " pion(s) !");
        await sleep(CAPTURE_RETURN_MS);
        if (!partieActive(idPartie)) return;
    }

    /* --- 6. Arrivée du pion --- */
    if (result.arrived) {
        animateTokenBody(color, tokenIndex, "arrived", ARRIVAL_MS);
        await sleep(ARRIVAL_MS);
        if (!partieActive(idPartie)) return;
    }

    gameState.isAnimatingMove = false;
    gameState.diceRolled = false;
    gameState.diceValue  = null;
    gameState.legalMoves = [];

    renderTokens();

    /* --- Victoire --- */
    if (result.victory) {
        terminerPartie(color);
        return;
    }

    /* --- 7. Bonus de tour, dans l'ordre --- */
    const raisons = [];
    if (result.reasons.six)     raisons.push("6");
    if (result.reasons.capture) raisons.push("capture");
    if (result.reasons.arrival) raisons.push("arrivée");

    /* --- 8. Tour suivant --- */
    if (raisons.length > 0) {
        gameState.lastRollWasSix = false;

        let texte = "Encore un tour !";
        if (raisons.indexOf("arrivée") !== -1) texte = "Pion arrivé — encore un tour !";
        else if (raisons.indexOf("capture") !== -1) texte = "Capture — encore un tour !";

        addHistoryEntry(color,
            "<strong>" + nomCourt(color) + "</strong> gagne un tour supplémentaire");

        updatePlayerPanel();
        updateActionPanel();
        setGameMessage(nomComplet(color) + " rejoue.");
        showBonusBadge(texte);
        planifierTourBot();
        return;
    }

    passerAuJoueurSuivant();
}

function terminerPartie(color) {
    gameState.winner = color;
    annulerBot();
    enregistrerResultatClasse(color);
    if (diceButton) diceButton.disabled = true;
    if (diceButtonLabel) diceButtonLabel.textContent = "PARTIE TERMINÉE";
    hideBonusBadge();
    setGameMessage(nomComplet(color) + " a gagné !");
    addHistoryEntry(color, "<strong>" + nomCourt(color) + "</strong> gagne la partie !");
    showToast(nomComplet(color) + " a gagné !");
    updatePlayerPanel();
    updateLegalMoveHighlights();
    showWinnerOverlay(color);
}


/* ============================================================
   16. TOURS
   ============================================================ */

function passerAuJoueurSuivant() {
    gameState.currentPlayerIndex = (gameState.currentPlayerIndex + 1) % PLAYER_ORDER.length;
    gameState.diceValue        = null;
    gameState.diceRolled       = false;
    gameState.legalMoves       = [];
    gameState.lastRollWasSix   = false;
    gameState.consecutiveSixes = 0;

    hideBonusBadge();
    updatePlayerPanel();
    updateActionPanel();
    renderTokens();

    /* Si le nouveau joueur est un bot, il prend la main tout seul. */
    planifierTourBot();
}


/* ============================================================
   17. DÉ
   ------------------------------------------------------------
   UNE seule valeur est tirée, AVANT l'animation.
   L'animation ne fait qu'afficher des faces intermédiaires :
   elle ne décide de rien.
   ============================================================ */

function setDiceFace(value) {
    if (!diceCube) return;
    diceCube.dataset.value = value;
    const activePips = new Set(DICE_PIP_PATTERNS[value] || []);
    diceCube.querySelectorAll(".pip").forEach(function (pip, index) {
        pip.classList.toggle("active", activePips.has(index + 1));
    });
    if (diceValueText) diceValueText.textContent = "Résultat du dé : " + value;
}

/* Intervalles de plus en plus longs : le dé ralentit progressivement. */
function buildDiceTimeline(totalMs) {
    const steps = [];
    let elapsed = 0;
    let interval = 45;
    while (elapsed + interval < totalMs) {
        steps.push(interval);
        elapsed += interval;
        interval = Math.round(interval * 1.22);
    }
    return steps;
}

async function lancerDe(lancePourLeBot) {
    if (!gameState) return;
    if (gameState.isRolling || gameState.isAnimatingMove || gameState.diceRolled || gameState.winner) return;

    const color    = currentPlayerColor();
    const idPartie = partieId;

    /* Un humain ne lance jamais le dé d'un bot, et inversement. */
    if (estBot(color) && lancePourLeBot !== true) return;
    if (!estBot(color) && lancePourLeBot === true) return;

    /* === 1. TIRAGE UNIQUE — c'est LA valeur du moteur. === */
    const value = Math.floor(Math.random() * 6) + 1;

    gameState.isRolling = true;
    hideBonusBadge();
    if (diceButton) {
        diceButton.disabled = true;
        diceButton.setAttribute("aria-busy", "true");
    }
    if (diceButtonLabel) diceButtonLabel.textContent = "LE DÉ ROULE...";
    setGameMessage("Le dé roule…");

    /* === 2. ANIMATION purement visuelle. === */
    if (diceCube && !prefersReducedMotion()) {
        diceCube.classList.remove("rolling");
        void diceCube.offsetWidth;
        diceCube.classList.add("rolling");

        const timeline = buildDiceTimeline(DICE_ANIMATION_MS);
        for (const interval of timeline) {
            if (!partieActive(idPartie)) return;
            setDiceFace(Math.floor(Math.random() * 6) + 1);
            await sleep(interval);
        }
    }

    if (!partieActive(idPartie)) return;

    /* === 3. La face affichée est celle du moteur, toujours. === */
    setDiceFace(value);
    if (diceCube) {
        diceCube.classList.remove("rolling");
        diceCube.classList.remove("settled");
        void diceCube.offsetWidth;
        diceCube.classList.add("settled");
    }
    if (lastResultValue) lastResultValue.textContent = value;
    if (diceButton) diceButton.removeAttribute("aria-busy");

    gameState.isRolling = false;
    gameState.consecutiveSixes = (value === 6) ? gameState.consecutiveSixes + 1 : 0;

    addHistoryEntry(color, "<strong>" + nomCourt(color) + "</strong> obtient un " + value);

    /* === 4. Trois 6 d'affilée : le TOUR passe au joueur suivant.
           Aucun pion retiré, aucun coup annulé, aucune défaite. === */
    if (RULES.TROIS_6_TOUR_PERDU && gameState.consecutiveSixes >= 3) {
        gameState.diceValue  = null;
        gameState.diceRolled = false;
        addHistoryEntry(color,
            "<strong>" + nomCourt(color) + "</strong> : troisième 6, le tour passe");
        showToast("Trois 6 d'affilée : le tour passe (aucun pion perdu).");
        setGameMessage("Trois 6 d'affilée : ce lancer est perdu, la partie continue normalement.");
        await sleep(1000);
        if (!partieActive(idPartie)) return;
        passerAuJoueurSuivant();
        return;
    }

    /* === 5. Coups légaux calculés à partir de la valeur du moteur. === */
    gameState.diceValue      = value;
    gameState.diceRolled     = true;
    gameState.lastRollWasSix = (value === 6);
    gameState.legalMoves     = getLegalMoves(color, value);

    renderTokens();
    updatePlayerPanel();

    if (gameState.legalMoves.length === 0) {
        addHistoryEntry(color, "Aucun déplacement possible");
        setGameMessage("Aucun déplacement possible avec un " + value + ".");
        gameState.diceRolled = false;
        gameState.diceValue  = null;
        await sleep(800);
        if (!partieActive(idPartie)) return;

        if (RULES.GARDER_LA_MAIN_SI_6_SANS_COUP && value === 6) {
            gameState.lastRollWasSix = false;
            updateActionPanel();
            setGameMessage(nomComplet(color) + " relance le dé.");
        } else {
            passerAuJoueurSuivant();
        }
        return;
    }

    updateActionPanel();
    if (estBot(color)) {
        setGameMessage("🤖 " + nomComplet(color) + " réfléchit…");
    } else {
        setGameMessage(value === 6
            ? "Tu as fait 6 : choisis un pion (sortie ou déplacement)."
            : "Tu as fait " + value + " : choisis un pion.");
    }
}


/* ============================================================
   18. OVERLAY VICTOIRE
   ============================================================ */

function showWinnerOverlay(color) {
    if (!winnerOverlay) return;
    if (winnerName) winnerName.textContent = nomComplet(color);
    if (winnerColorDot) winnerColorDot.className = "winner-color-dot " + color;
    winnerOverlay.hidden = false;
    winnerOverlay.setAttribute("aria-hidden", "false");
    requestAnimationFrame(function () { winnerOverlay.classList.add("show"); });
}

function hideWinnerOverlay() {
    if (!winnerOverlay) return;
    winnerOverlay.classList.remove("show");
    winnerOverlay.setAttribute("aria-hidden", "true");
    setTimeout(function () { winnerOverlay.hidden = true; }, 300);
}


/* ============================================================
   19. NOUVELLE PARTIE
   ============================================================ */

function recommencerPartie() {
    /* 1. On invalide immédiatement tout ce qui tournait encore. */
    partieId += 1;
    annulerBot();
    clearTimeout(toastTimer);
    clearTimeout(bonusTimer);
    if (toast) toast.classList.remove("show");

    hideWinnerOverlay();
    hideBonusBadge();
    gameState = createInitialState();
    demarrerNouveauMatch();

    if (diceCube) {
        diceCube.classList.remove("rolling");
        diceCube.classList.remove("settled");
    }
    setDiceFace(1);

    if (diceButton) {
        diceButton.disabled = false;
        diceButton.removeAttribute("aria-busy");
    }
    if (diceButtonLabel) diceButtonLabel.textContent = "LANCER LE DÉ";
    if (lastResultValue) lastResultValue.textContent = "—";
    if (gameModeLabel)   gameModeLabel.textContent = MATCH_CONFIG.label;

    updatePlayerPanel();
    updateActionPanel();
    if (estBot(currentPlayerColor())) {
        setGameMessage("🤖 " + nomComplet(currentPlayerColor()) + " commence…");
    } else {
        setGameMessage("Au tour du " + PLAYERS[currentPlayerColor()].name.toLowerCase() + ". Lance le dé.");
    }
    renderHistory();
    createBoard();

    /* Si le premier siège est tenu par un bot, il démarre seul. */
    planifierTourBot();
}


/* ============================================================
   20. NAVIGATION
   ============================================================ */

function setActiveNav(id) {
    document.querySelectorAll(".nav-button").forEach(b => b.classList.remove("active"));
    const element = document.getElementById(id);
    if (element) element.classList.add("active");
}

function showHomeScreen() {
    if (gameScreen) gameScreen.classList.remove("active-screen");
    if (homeScreen) homeScreen.classList.add("active-screen");
    setActiveNav("navHome");
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function showGameScreen(modeId) {
    if (homeScreen) homeScreen.classList.remove("active-screen");
    if (gameScreen) gameScreen.classList.add("active-screen");
    setActiveNav("navPlay");
    if (typeof modeId === "string" && GAME_MODES[modeId]) appliquerMode(modeId);
    recommencerPartie();
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function comingSoon(label) { showToast(label + " — bientôt disponible."); }


/* ============================================================
   21. ÉVÉNEMENTS
   ============================================================ */

if (playNowButton)    playNowButton.addEventListener("click", function () { showGameScreen("solo"); });
if (backHomeButton)   backHomeButton.addEventListener("click", showHomeScreen);
if (brandHome)        brandHome.addEventListener("click", showHomeScreen);
if (navHome)          navHome.addEventListener("click", showHomeScreen);
if (navPlay)          navPlay.addEventListener("click", function () { showGameScreen(); });
if (navRanking)       navRanking.addEventListener("click", () => comingSoon("Le classement"));
if (navEvents)        navEvents.addEventListener("click", () => comingSoon("Les événements"));
if (navShop)          navShop.addEventListener("click", () => comingSoon("La boutique"));
if (navLogin)         navLogin.addEventListener("click", () => comingSoon("La connexion"));
if (navProfile)       navProfile.addEventListener("click", () => comingSoon("Le profil"));
if (navNotifications) navNotifications.addEventListener("click", () => comingSoon("Les notifications"));

modeButtons.forEach(button => button.addEventListener("click", function () {
    showGameScreen(button.dataset.mode);
}));

/* Choix du niveau des bots (accueil). */
botLevelButtons.forEach(button => button.addEventListener("click", function () {
    definirNiveauDesBots(button.dataset.level);
    botLevelButtons.forEach(b => b.classList.toggle("active", b === button));
}));

if (diceButton)        diceButton.addEventListener("click", lancerDe);
if (restartButton)     restartButton.addEventListener("click", recommencerPartie);
if (newGameButton)     newGameButton.addEventListener("click", recommencerPartie);
if (playAgainButton)   playAgainButton.addEventListener("click", recommencerPartie);
if (backToHomeFromWin) backToHomeFromWin.addEventListener("click", function () {
    hideWinnerOverlay();
    showHomeScreen();
});

if (soundButton)    soundButton.addEventListener("click", () => comingSoon("Le son"));
if (settingsButton) settingsButton.addEventListener("click", () => comingSoon("Les paramètres"));
if (helpButton)     helpButton.addEventListener("click", () => comingSoon("L'aide"));


/* ============================================================
   B. MODULE IA — MODES, SIÈGES ET BOTS
   ------------------------------------------------------------
   Ce module ne contient AUCUNE règle de Ludo.
   Il ne fait que CHOISIR une action parmi les coups que le
   moteur (getLegalMoves / isLegalMove) déclare légaux, puis il
   appelle exactement les mêmes fonctions qu'un humain :
   lancerDe() et deplacerPion().

   Il ne touche jamais directement à gameState.tokens.
   ============================================================ */


/* ------------------------------------------------------------
   B1. SIÈGES ET MODES DE JEU
   ------------------------------------------------------------
   Un "siège" = une couleur, tenue soit par un humain, soit par
   un bot. Changer qui joue quelle couleur = changer cette map.
   ------------------------------------------------------------ */

/* SEAT_TYPE, BOT_LEVELS, GAME_MODES : voir shared/constants.js */

/* Configuration du match en cours. Une seule source de vérité. */
const MATCH_CONFIG = {
    /* "local"  : partie jouée entièrement dans ce navigateur (aujourd'hui, toujours ce cas).
       "online" : partie dont le serveur est la source de vérité (pas encore implémenté :
                  ce champ existe déjà pour que rien n'ait à être réécrit le jour venu). */
    gameMode: "local",

    modeId:   "solo",
    label:    GAME_MODES.solo.label,
    ranked:   GAME_MODES.solo.ranked,
    botLevel: BOT_LEVELS.NORMAL,
    seats:    Object.assign({}, GAME_MODES.solo.seats),
    matchId:  null
};

/* Vrai partout aujourd'hui : personne n'a encore codé le mode "online".
   Le jour où il existera, ce sera le seul endroit à vérifier pour savoir
   si le moteur local doit garder la main ou attendre le serveur. */
function estPartieLocale() {
    return MATCH_CONFIG.gameMode === "local";
}

/* Registre des joueurs de la partie en cours.
   Une entrée par couleur : { color, type, name, level, remoteId }.
   Demain, remplacer un bot par un joueur en ligne se résumera à
   passer son type à SEAT_TYPE.ONLINE et à renseigner remoteId. */
const MATCH_PLAYERS = {};

/* Raccourci vers les seuls joueurs pilotés par l'IA. */
const BOT_PLAYERS = {};

function creerJoueur(color, type, level) {
    return {
        color:    color,
        type:     type,
        name:     (type === SEAT_TYPE.BOT) ? ("Bot " + PLAYERS[color].shortName) : PLAYERS[color].name,
        level:    (type === SEAT_TYPE.BOT) ? level : null,
        remoteId: null,
        fixedLevel: false
    };
}

function getPlayer(color) {
    if (!MATCH_PLAYERS[color]) MATCH_PLAYERS[color] = creerJoueur(color, SEAT_TYPE.HUMAN, null);
    return MATCH_PLAYERS[color];
}

function appliquerMode(modeId) {
    const mode = GAME_MODES[modeId];
    if (!mode) return;
    MATCH_CONFIG.modeId = mode.id;
    MATCH_CONFIG.label  = mode.label;
    MATCH_CONFIG.ranked = mode.ranked;
    MATCH_CONFIG.seats  = Object.assign({}, mode.seats);
    synchroniserBots();
}

/* Point d'extension : changer les couleurs tenues par les humains.
   Exemple : configurerSieges({ red:"human", green:"bot", blue:"bot", yellow:"human" }) */
function configurerSieges(seats) {
    PLAYER_ORDER.forEach(color => {
        if (seats && seats[color]) MATCH_CONFIG.seats[color] = seats[color];
    });
    synchroniserBots();
}

function definirNiveauDesBots(level) {
    if (level !== BOT_LEVELS.EASY && level !== BOT_LEVELS.NORMAL && level !== BOT_LEVELS.HARD) return;
    MATCH_CONFIG.botLevel = level;
    synchroniserBots();
}

/* Permet d'avoir des niveaux différents dans la même partie. */
function definirNiveauDuBot(color, level) {
    if (!estBot(color)) return;
    if (level !== BOT_LEVELS.EASY && level !== BOT_LEVELS.NORMAL && level !== BOT_LEVELS.HARD) return;
    const joueur = getPlayer(color);
    joueur.level      = level;
    joueur.fixedLevel = true;
    BOT_PLAYERS[color] = joueur;
}

function synchroniserBots() {
    PLAYER_ORDER.forEach(color => {
        const type    = (MATCH_CONFIG.seats && MATCH_CONFIG.seats[color]) || SEAT_TYPE.HUMAN;
        const ancien  = MATCH_PLAYERS[color];
        const niveau  = (ancien && ancien.fixedLevel) ? ancien.level : MATCH_CONFIG.botLevel;

        const joueur = creerJoueur(color, type, niveau);
        joueur.fixedLevel = !!(ancien && ancien.fixedLevel && type === SEAT_TYPE.BOT);
        MATCH_PLAYERS[color] = joueur;

        if (type === SEAT_TYPE.BOT) BOT_PLAYERS[color] = joueur;
        else delete BOT_PLAYERS[color];
    });
}

function typeDeSiege(color) {
    return getPlayer(color).type;
}

function estBot(color) {
    return typeDeSiege(color) === SEAT_TYPE.BOT;
}

/* Un joueur « local » est pilote depuis cet appareil (humain ou bot). */
function estLocal(color) {
    return typeDeSiege(color) !== SEAT_TYPE.ONLINE;
}

function niveauDuBot(color) {
    return getPlayer(color).level || MATCH_CONFIG.botLevel;
}

/* Noms affichés : « Bot Vert » au lieu de « Joueur vert ». */
function nomComplet(color) {
    return getPlayer(color).name;
}

function nomCourt(color) {
    return estBot(color) ? ("Bot " + PLAYERS[color].shortName) : PLAYERS[color].shortName;
}

/* Nombre de joueurs humains, utile pour les libellés de l'interface. */
function nombreHumains() {
    return PLAYER_ORDER.filter(c => typeDeSiege(c) === SEAT_TYPE.HUMAN).length;
}


/* ------------------------------------------------------------
   B2. MODE CLASSÉ (structure locale uniquement)
   ------------------------------------------------------------
   Aucun faux serveur, aucun faux matchmaking : juste les points
   d'accroche qu'un vrai backend viendra remplir plus tard.
   ------------------------------------------------------------ */

const RANKED = {
    dernierMatch: null,
    /* À remplacer plus tard par un vrai appel réseau. */
    onMatchEnd: null
};

function demarrerNouveauMatch() {
    synchroniserBots();
    MATCH_CONFIG.matchId = "local-" + Date.now();
    RANKED.dernierMatch = {
        matchId: MATCH_CONFIG.matchId,
        mode: MATCH_CONFIG.modeId,
        ranked: MATCH_CONFIG.ranked,
        botLevel: MATCH_CONFIG.botLevel,
        seats: Object.assign({}, MATCH_CONFIG.seats),
        winner: null
    };
}

function enregistrerResultatClasse(winnerColor) {
    if (!RANKED.dernierMatch) return;
    RANKED.dernierMatch.winner = winnerColor;
    RANKED.dernierMatch.winnerIsBot = estBot(winnerColor);
    if (MATCH_CONFIG.ranked) {
        console.log("LUDO — résultat de partie classée (local) :", RANKED.dernierMatch);
    }
    if (typeof RANKED.onMatchEnd === "function") {
        try { RANKED.onMatchEnd(Object.assign({}, RANKED.dernierMatch)); }
        catch (error) { console.error("LUDO — onMatchEnd :", error); }
    }
}


/* ------------------------------------------------------------
   B3. PONDÉRATIONS PAR NIVEAU
   ------------------------------------------------------------
   tolerance     : écart de score accepté pour varier un peu
   mistakeChance : probabilité d'une erreur « humaine »
   seuilCritique : au-dessus, le bot ne se trompe jamais
   ------------------------------------------------------------ */

/* BOT_CONFIG : voir shared/constants.js */

/* Délai avant/pendant la réflexion, légèrement variable. */
const BOT_DELAI_AVANT_LANCER = [380, 680];
const BOT_DELAI_REPLANIFICATION = 420;

function delaiAleatoire(min, max) {
    return Math.round(min + Math.random() * (max - min));
}


/* ------------------------------------------------------------
   B4. LECTURE DE LA POSITION (aucune écriture)
   ------------------------------------------------------------ */

/* alliesSurRing, adversairesDerriere, ciblesAuProchainTour,
   risqueDeCapture : voir shared/bot.js (via wrappers en haut). */


/* ------------------------------------------------------------
   B5. ANALYSE D'UN COUP
   ------------------------------------------------------------ */

/* analyserCoupBot : voir shared/bot.js. */


/* ------------------------------------------------------------
   B6. NOTATION D'UN COUP
   ------------------------------------------------------------ */

/* scoreMove : voir shared/bot.js. */


/* ------------------------------------------------------------
   B7. CHOIX DU COUP
   ------------------------------------------------------------
   Le moteur fournit la liste des coups légaux.
   Le bot ne fait que choisir dans cette liste.
   ------------------------------------------------------------ */

/* chooseBotMove : voir shared/bot.js. */


/* ------------------------------------------------------------
   B8. ORCHESTRATION DU TOUR DU BOT
   ------------------------------------------------------------
   Un seul bot agit à la fois. Toute partie relancée invalide
   les réflexions en cours (botSequence).
   ------------------------------------------------------------ */

let botTimer    = null;
let botEnCours  = false;
let botSequence = 0;

function annulerBot() {
    botSequence += 1;
    if (botTimer) clearTimeout(botTimer);
    botTimer   = null;
    botEnCours = false;
    if (gameState) gameState.isBotThinking = false;
    if (turnCard) turnCard.classList.remove("bot-turn");
}

function planifierTourBot(delai) {
    if (botTimer) clearTimeout(botTimer);
    botTimer = setTimeout(verifierTourBot,
        typeof delai === "number" ? delai : BOT_DELAI_REPLANIFICATION);
}

function verifierTourBot() {
    botTimer = null;
    if (botEnCours) return;                       /* le bot en cours se replanifiera lui-même */
    if (!gameState || gameState.winner) return;

    if (gameState.isRolling || gameState.isAnimatingMove || gameState.isBotThinking) {
        planifierTourBot(220);
        return;
    }

    const color = currentPlayerColor();
    if (!estBot(color)) {
        /* Filet de sécurité : si le tour revient à un humain, on garantit
           que ses commandes sont bien réactivées, quoi qu'il se soit passé. */
        updateActionPanel();
        return;
    }

    executeBotTurn(color);
}

function cestToujoursSonTour(color, seq) {
    return seq === botSequence
        && gameState
        && !gameState.winner
        && currentPlayerColor() === color;
}

function messageBot(color, texte, sousTitre) {
    setGameMessage("🤖 " + nomComplet(color) + " " + texte);
    if (playerInfoSmall) playerInfoSmall.textContent = sousTitre || "Tour du bot";
    if (turnCard) turnCard.classList.add("bot-turn");
}

async function executeBotTurn(color) {
    const seq   = botSequence;
    const level = niveauDuBot(color);
    const config = BOT_CONFIG[level] || BOT_CONFIG.normal;

    botEnCours = true;
    gameState.isBotThinking = true;

    try {
        /* --- 1. Le bot prend le dé --- */
        if (!gameState.diceRolled) {
            updateActionPanel();
            messageBot(color, "s'apprête à lancer le dé…", "Prépare son lancer");
            await sleep(delaiAleatoire(BOT_DELAI_AVANT_LANCER[0], BOT_DELAI_AVANT_LANCER[1]));
            if (!cestToujoursSonTour(color, seq)) return;

            /* Exactement la même fonction qu'un humain. */
            await lancerDe(true);
            if (seq !== botSequence) return;
        }

        /* Le moteur a pu passer le tour (3 six, aucun coup possible…). */
        if (!cestToujoursSonTour(color, seq)) return;
        if (!gameState.diceRolled || gameState.legalMoves.length === 0) return;

        /* --- 2. Réflexion --- */
        messageBot(color, "réfléchit…", "Le bot réfléchit…");
        await sleep(delaiAleatoire(config.reflexionMin, config.reflexionMax));
        if (!cestToujoursSonTour(color, seq)) return;
        if (!gameState.diceRolled || gameState.legalMoves.length === 0) return;

        /* --- 3. Décision --- */
        const move = chooseBotMove(color, gameState.diceValue, level);
        if (!move) return;

        /* Ceinture et bretelles : on revalide avec le moteur. */
        if (!isLegalMove(color, move.tokenIndex, gameState.diceValue)) return;

        /* --- 4. Animation de sélection, puis déplacement --- */
        messageBot(color, "joue…", "Le bot joue…");
        animateTokenBody(color, move.tokenIndex, "picked", 220);
        await sleep(220);
        if (!cestToujoursSonTour(color, seq)) return;

        await deplacerPion(color, move.tokenIndex, move.to);
    } catch (error) {
        console.error("LUDO — erreur pendant le tour du bot :", error);
    } finally {
        botEnCours = false;
        if (gameState) gameState.isBotThinking = false;

        /* On ne retire le voyant que si le tour ne revient pas à un bot. */
        if (turnCard && (!gameState || gameState.winner || !estBot(currentPlayerColor()))) {
            turnCard.classList.remove("bot-turn");
        }

        /* CAPITAL : le verrou vient d'être relâché, il faut redonner
           la main à l'interface, sinon le bouton du dé reste grisé
           pour le joueur humain qui suit. */
        if (gameState && !gameState.winner) {
            updatePlayerPanel();
            updateActionPanel();
        }

        if (seq === botSequence && gameState && !gameState.winner) planifierTourBot();
    }
}


/* ------------------------------------------------------------
   B9. TESTS DU BOT (console, F12)
   ------------------------------------------------------------ */

function runBotTests() {
    const sauvegardeEtat  = gameState;
    const sauvegardeSieges = Object.assign({}, MATCH_CONFIG.seats);
    const resultats = [];

    try {
        configurerSieges({ red: SEAT_TYPE.HUMAN, green: SEAT_TYPE.BOT, blue: SEAT_TYPE.HUMAN, yellow: SEAT_TYPE.BOT });

        /* TEST 13/14 — répartition des sièges */
        assertRule(estBot("green") && estBot("yellow"), "vert et jaune doivent être des bots");
        assertRule(!estBot("red") && !estBot("blue"), "rouge et bleu doivent rester humains");
        assertRule(nomComplet("green") === "Bot Vert", "le nom affiché du bot est incorrect");
        resultats.push("Mode 1v1 : 2 humains + 2 bots, noms corrects");

        /* TEST 2/3 — un 6 permet la sortie de base */
        gameState = createInitialState();
        let coup = chooseBotMove("green", 6, BOT_LEVELS.HARD);
        assertRule(coup !== null && coup.from === -1, "avec un 6 et 4 pions en base, le bot doit sortir");
        resultats.push("TEST 2/3 — le bot sort un pion avec un 6");

        /* TEST 1 — aucun coup possible sans 6 depuis la base */
        gameState = createInitialState();
        assertRule(chooseBotMove("green", 4, BOT_LEVELS.HARD) === null,
            "aucun coup ne doit exister avec un 4 depuis la base");
        resultats.push("TEST 1 — le bot ne joue pas quand aucun coup n'est légal");

        /* TEST 5 — capture sur case normale privilégiée */
        gameState = createInitialState();
        setTokenPosition(getToken("green", 0), 3);     /* capture possible en avançant de 2 */
        setTokenPosition(getToken("green", 1), 20);
        const cibleRing = getRingIndex("green", 5);
        assertRule(!isSafeRingIndex(cibleRing), "la case témoin doit être normale");
        const rougeSurCible = (cibleRing - PLAYERS.red.offset + RING.length) % RING.length;
        setTokenPosition(getToken("red", 0), rougeSurCible);
        coup = chooseBotMove("green", 2, BOT_LEVELS.HARD);
        assertRule(coup.tokenIndex === 0, "le bot doit choisir la capture");
        assertRule(analyserCoupBot("green", coup).captures.length === 1, "la capture doit être détectée");
        resultats.push("TEST 5 — le bot privilégie une capture sur case normale");

        /* TEST 6 — aucune valeur de capture sur case protégée */
        gameState = createInitialState();
        const etoile = STAR_RING_INDEXES[0];
        const vertAvantEtoile = (etoile - PLAYERS.green.offset + RING.length) % RING.length - 2;
        setTokenPosition(getToken("green", 0), vertAvantEtoile);
        const rougeSurEtoile = (etoile - PLAYERS.red.offset + RING.length) % RING.length;
        setTokenPosition(getToken("red", 0), rougeSurEtoile);
        const analyseEtoile = analyserCoupBot("green", { tokenIndex: 0, from: vertAvantEtoile, to: vertAvantEtoile + 2 });
        assertRule(analyseEtoile.captures.length === 0, "le bot ne doit voir aucune capture sur une étoile");
        assertRule(analyseEtoile.captureBloqueeParProtection === true, "la protection doit être détectée");
        resultats.push("TEST 6 — le bot ne compte jamais une capture sur case protégée");

        /* TEST 7 — un blocage adverse rend le coup illégal, donc invisible pour le bot */
        gameState = createInitialState();
        setTokenPosition(getToken("red", 0), 5);
        setTokenPosition(getToken("red", 1), 5);
        setTokenPosition(getToken("green", 0), 43);    /* vert 44 = ring 5 = le blocage */
        assertRule(getBlockAtRingIndex(getRingIndex("red", 5)) !== null, "le blocage rouge doit exister");
        const coupsVert = getLegalMoves("green", 1);
        assertRule(coupsVert.every(m => m.tokenIndex !== 0), "le coup vers le blocage doit être illégal");
        const choix = chooseBotMove("green", 1, BOT_LEVELS.HARD);
        assertRule(choix === null || choix.tokenIndex !== 0, "le bot ne doit jamais traverser un blocage");
        resultats.push("TEST 7 — le bot ne franchit jamais un blocage adverse");

        /* TEST 8 — création de blocage valorisée */
        gameState = createInitialState();
        setTokenPosition(getToken("green", 0), 14);    /* un allié attend déjà sur la case 14 */
        setTokenPosition(getToken("green", 1), 12);
        const scoreBloc = scoreMove("green", { tokenIndex: 1, from: 12, to: 14 }, BOT_LEVELS.HARD);
        setTokenPosition(getToken("green", 0), 30);
        const scoreSansBloc = scoreMove("green", { tokenIndex: 1, from: 12, to: 14 }, BOT_LEVELS.HARD);
        assertRule(scoreBloc > scoreSansBloc, "créer un blocage doit rapporter des points");
        resultats.push("TEST 8 — le bot valorise la création d'un blocage");

        /* TEST 9 — l'arrivée passe avant tout le reste */
        gameState = createInitialState();
        setTokenPosition(getToken("green", 0), 54);    /* arrive avec un 2 */
        setTokenPosition(getToken("green", 1), 20);
        coup = chooseBotMove("green", 2, BOT_LEVELS.HARD);
        assertRule(coup.tokenIndex === 0 && coup.to === FINISH_POSITION,
            "le bot doit amener le pion à l'arrivée");
        resultats.push("TEST 9 — le bot amène un pion à l'arrivée quand c'est possible");

        /* TEST 10 — pas de dépassement de l'arrivée */
        gameState = createInitialState();
        setTokenPosition(getToken("green", 0), 54);
        const coupsTrop = getLegalMoves("green", 4);
        assertRule(coupsTrop.every(m => m.tokenIndex !== 0), "aucun dépassement de l'arrivée");
        resultats.push("TEST 10 — le bot respecte le nombre exact à l'arrivée");

        /* Sécurité : le bot préfère une case sûre à une case menacée */
        gameState = createInitialState();
        setTokenPosition(getToken("green", 0), 5);
        setTokenPosition(getToken("green", 1), 30);
        const ringMenace = getRingIndex("green", 9);   /* case normale, non protégée */
        assertRule(!isSafeRingIndex(ringMenace), "la case témoin doit être normale");
        const rougeDerriere = (ringMenace - 3 - PLAYERS.red.offset + RING.length) % RING.length;
        setTokenPosition(getToken("red", 0), rougeDerriere);
        const risque = risqueDeCapture("green", 9, false);
        assertRule(risqueDeCapture("green", 8, false) === 0, "une étoile ne présente jamais de risque");
        assertRule(risque > 0, "le bot doit détecter une menace de capture");
        resultats.push("Le bot évalue le risque de se faire capturer");

        /* Le meilleur coup reste largement favorisé */
        gameState = createInitialState();
        setTokenPosition(getToken("green", 0), 54);
        setTokenPosition(getToken("green", 1), 10);
        let arrivees = 0;
        for (let i = 0; i < 200; i++) {
            const c = chooseBotMove("green", 2, BOT_LEVELS.NORMAL);
            if (c.to === FINISH_POSITION) arrivees += 1;
        }
        assertRule(arrivees >= 190, "un coup nettement meilleur doit être choisi presque toujours");
        resultats.push("Aléatoire contrôlé : le meilleur coup est fortement favorisé (" + arrivees + "/200)");

        /* Performance */
        gameState = createInitialState();
        PLAYER_ORDER.forEach((c, i) => {
            for (let k = 0; k < 4; k++) setTokenPosition(getToken(c, k), (i * 7 + k * 5) % 45);
        });
        const debut = (typeof performance !== "undefined" ? performance.now() : Date.now());
        for (let i = 0; i < 300; i++) chooseBotMove("green", (i % 6) + 1, BOT_LEVELS.HARD);
        const duree = (typeof performance !== "undefined" ? performance.now() : Date.now()) - debut;
        assertRule(duree < 800, "le calcul du bot doit rester rapide (" + Math.round(duree) + " ms)");
        resultats.push("Performance : 300 décisions en " + Math.round(duree) + " ms");

        /* TEST 11 — plus aucun bot n'agit après la victoire */
        gameState = createInitialState();
        gameState.currentPlayerIndex = 1;          /* vert = bot */
        gameState.winner = "red";
        verifierTourBot();
        assertRule(botEnCours === false, "aucun bot ne doit démarrer après la victoire");
        assertRule(botTimer === null, "aucun timer de bot ne doit rester après la victoire");
        resultats.push("TEST 11 — les bots s'arrêtent dès qu'il y a un gagnant");

        /* TEST 12 — plusieurs bots cohabitent */
        assertRule(Object.keys(BOT_PLAYERS).length === 2, "le mode 1v1 doit contenir exactement 2 bots");
        configurerSieges(GAME_MODES.solo.seats);
        assertRule(Object.keys(BOT_PLAYERS).length === 3, "le mode solo doit contenir 3 bots");
        assertRule(nombreHumains() === 1, "le mode solo doit contenir 1 humain");
        resultats.push("TEST 12 — solo : 1 humain + 3 bots, 1v1 : 2 humains + 2 bots");

        /* Verrou de réflexion : il doit toujours pouvoir être relâché */
        gameState = createInitialState();
        gameState.isBotThinking = true;
        annulerBot();
        assertRule(gameState.isBotThinking === false,
            "le verrou de réflexion doit être relâché à l'annulation");
        resultats.push("Le verrou isBotThinking ne peut jamais rester bloqué");

        /* TEST 13 — une nouvelle partie remet tout à zéro */
        const idAvant = partieId;
        annulerBot();
        assertRule(botTimer === null && botEnCours === false, "annulerBot doit tout couper");
        gameState = createInitialState();
        assertRule(gameState.tokens.every(t => t.position === -1), "tous les pions reviennent en base");
        assertRule(gameState.history.length === 0, "l'historique est vidé");
        assertRule(gameState.winner === null && gameState.diceRolled === false
                && gameState.isBotThinking === false && gameState.isAnimatingMove === false,
            "tous les verrous doivent être relâchés");
        assertRule(partieId === idAvant, "l'identifiant de partie ne change qu'au vrai redémarrage");
        resultats.push("TEST 13 — nouvelle partie : positions, verrous et bots réinitialisés");

        /* Types de joueur prêts pour le multijoueur */
        assertRule(getPlayer("red").type === SEAT_TYPE.HUMAN, "rouge doit être de type human");
        assertRule(getPlayer("green").type === SEAT_TYPE.BOT, "vert doit être de type bot");
        assertRule(SEAT_TYPE.ONLINE === "online", "le type online doit rester réservé");
        assertRule(estLocal("red") && estLocal("green"), "tous les joueurs sont locaux en V1");
        resultats.push("Structure player.type prête pour le multijoueur (human / bot / online)");

        console.log("%c✓ BOT LUDO — tous les tests passent", "color:#43A047;font-weight:bold");
        resultats.forEach(r => console.log("   ✓ " + r));
    } catch (error) {
        console.error("%c✗ BOT LUDO — " + error.message, "color:#E53935;font-weight:bold");
    } finally {
        gameState = sauvegardeEtat;
        MATCH_CONFIG.seats = sauvegardeSieges;
        synchroniserBots();
    }
}


/* ============================================================
   22. AUTO-TESTS DU MOTEUR
   ------------------------------------------------------------
   S'exécutent au chargement, résultats visibles dans la console (F12).
   ============================================================ */

function assertRule(condition, message) {
    if (!condition) throw new Error("Test échoué : " + message);
}

function runEngineTests() {
    const saved = gameState;
    const results = [];
    try {
        /* --- Géométrie --- */
        assertRule(RING.length === 52, "le parcours commun doit contenir 52 cases");
        const uniqueRing = new Set(RING.map(c => coordinateKey(c[0], c[1])));
        assertRule(uniqueRing.size === 52, "aucune case du parcours ne doit être dupliquée");
        results.push("Parcours commun : 52 cases uniques");

        for (let i = 0; i < RING.length; i++) {
            const a = RING[i];
            const b = RING[(i + 1) % RING.length];
            assertRule(Math.abs(a[0] - b[0]) <= 1 && Math.abs(a[1] - b[1]) <= 1,
                "parcours discontinu entre les index " + i + " et " + ((i + 1) % RING.length));
        }
        results.push("Parcours continu : aucune téléportation");

        PLAYER_ORDER.forEach(color => {
            const entry = RING[(PLAYERS[color].offset + LAST_COMMON_POSITION) % RING.length];
            const first = HOME_PATHS[color][0];
            assertRule(Math.abs(entry[0] - first[0]) <= 1 && Math.abs(entry[1] - first[1]) <= 1,
                "couloir d'arrivée " + color + " non relié au parcours");
        });
        results.push("4 couloirs d'arrivée reliés au parcours");

        assertRule(PLAYERS.red.offset === 0 && PLAYERS.green.offset === 13
                && PLAYERS.blue.offset === 26 && PLAYERS.yellow.offset === 39,
            "les 4 départs doivent être espacés de 13 cases");
        results.push("4 cases de départ espacées de 13");

        /* --- Cases protégées --- */
        const nbSures = RULES.CASES_DEPART_SONT_SURES ? 8 : 4;
        assertRule(SAFE_RING_INDEXES.size === nbSures,
            "il doit y avoir " + nbSures + " cases sûres");
        PLAYER_ORDER.forEach(color => {
            assertRule(isSafeRingIndex(PLAYERS[color].offset) === RULES.CASES_DEPART_SONT_SURES,
                "protection de la case de départ " + color + " incohérente");
        });
        results.push(nbSures + " cases sûres (4 étoiles"
            + (RULES.CASES_DEPART_SONT_SURES ? " + 4 départs colorés)" : ")"));

        /* --- Règles de base --- */
        gameState = createInitialState();
        assertRule(gameState.tokens.length === 16, "il doit y avoir 16 pions");
        assertRule(gameState.tokens.every(t => t.state === TOKEN_STATE.BASE), "tous les pions démarrent en base");
        results.push("16 pions en base au départ");

        assertRule(!isLegalMove("red", 0, 5), "un pion en base ne sort pas avec 5");
        assertRule(isLegalMove("red", 0, 6), "un pion en base sort avec 6");
        results.push("Sortie de base uniquement avec 6");

        PLAYER_ORDER.forEach(color => {
            const coordinate = getLogicalCoordinate(color, 0);
            const expected   = RING[PLAYERS[color].offset];
            assertRule(coordinate[0] === expected[0] && coordinate[1] === expected[1],
                "mauvaise case de départ pour " + color);
        });
        results.push("Chaque couleur sort sur sa propre case de départ");

        gameState = createInitialState();
        setTokenPosition(getToken("red", 0), 54);
        assertRule(isLegalMove("red", 0, 2), "arrivée avec le nombre exact");
        assertRule(!isLegalMove("red", 0, 3), "pas de dépassement de l'arrivée");
        setTokenPosition(getToken("red", 0), FINISH_POSITION);
        assertRule(!isLegalMove("red", 0, 6), "un pion arrivé ne bouge plus");
        results.push("Arrivée au nombre exact, aucun dépassement");

        /* --- Blocage --- */
        gameState = createInitialState();
        setTokenPosition(getToken("red", 0), 5);
        setTokenPosition(getToken("red", 1), 5);
        const block = getBlockAtRingIndex(getRingIndex("red", 5));
        assertRule(block && block.color === "red" && block.count === 2, "2 pions rouges forment un blocage");

        setTokenPosition(getToken("green", 0), 43);
        assertRule(!isLegalMove("green", 0, 1), "un adversaire ne peut pas atterrir sur un blocage");
        setTokenPosition(getToken("green", 0), 42);
        assertRule(!isLegalMove("green", 0, 3), "un adversaire ne peut pas traverser un blocage");
        results.push("Blocage : ni traversée ni atterrissage");

        setTokenPosition(getToken("red", 1), 9);
        assertRule(getBlockAtRingIndex(getRingIndex("red", 5)) === null, "le blocage doit disparaître");
        results.push("Le blocage disparaît quand la condition tombe");

        /* --- Capture sur case NORMALE --- */
        gameState = createInitialState();
        setTokenPosition(getToken("red", 0), 4);
        setTokenPosition(getToken("green", 0), 44);   /* green 44 → ring 5 (non protégée) */
        assertRule(getRingIndex("green", 44) === getRingIndex("red", 5), "les deux pions visent la même case");
        assertRule(!isSafeRingIndex(getRingIndex("red", 5)), "la case témoin doit être normale");
        const capture = resoudreCapture("red", 5);
        assertRule(capture.captures.length === 1 && capture.captures[0].color === "green",
            "la bonne victime est capturée");
        assertRule(capture.captureBloqueeParProtection === false, "aucune protection sur une case normale");
        assertRule(getToken("green", 0).position === -1, "le pion capturé retourne en base");
        assertRule(getToken("green", 0).state === TOKEN_STATE.BASE, "l'état du pion capturé est BASE");
        results.push("Capture sur case normale : bonne cible, retour dans SA base");

        /* --- Capture IMPOSSIBLE sur case étoilée --- */
        gameState = createInitialState();
        const starRing = STAR_RING_INDEXES[0];                        /* ring 8 */
        setTokenPosition(getToken("red", 0), 8);                      /* red 8 → ring 8 */
        const greenOnStar = (starRing - PLAYERS.green.offset + RING.length) % RING.length;
        setTokenPosition(getToken("green", 0), greenOnStar);
        const surEtoile = resoudreCapture("green", greenOnStar);
        assertRule(surEtoile.captures.length === 0, "aucune capture sur une case étoilée");
        assertRule(surEtoile.captureBloqueeParProtection === true, "la protection doit être signalée");
        assertRule(getToken("red", 0).position === 8, "le pion protégé ne bouge pas");
        results.push("Case étoilée : capture impossible, le pion reste en place");

        /* --- Capture IMPOSSIBLE sur une case de DÉPART colorée --- */
        if (RULES.CASES_DEPART_SONT_SURES) {
            gameState = createInitialState();
            const blueStart = PLAYERS.blue.offset;                    /* ring 26 = [8,13] */
            setTokenPosition(getToken("blue", 0), 0);                 /* bleu sur SON départ */
            const greenOnBlueStart = (blueStart - PLAYERS.green.offset + RING.length) % RING.length;
            setTokenPosition(getToken("green", 0), greenOnBlueStart);
            const surDepart = resoudreCapture("green", greenOnBlueStart);
            assertRule(surDepart.captureBloqueeParProtection === true,
                "la case de départ bleue doit être protégée");
            assertRule(surDepart.captures.length === 0, "aucune capture sur une case de départ");
            assertRule(getToken("blue", 0).position === 0, "le pion bleu reste sur sa case de départ");
            results.push("Case de départ colorée : capture impossible (bug de la capture corrigé)");
        }

        /* --- Identité des pions --- */
        gameState = createInitialState();
        gameState.tokens.forEach(t => {
            assertRule(t.id === t.color + "-" + t.tokenIndex, "identifiant de pion incohérent");
            assertRule(t.player === t.color, "player et color doivent être identiques");
        });
        results.push("Identité des 16 pions cohérente");

        /* ============================================================
           ÉTAPE 4 — TESTS DE SÉCURISATION DES RÈGLES
           Aucun test ne touche au moteur : ils constatent, documentent
           et verrouillent le comportement actuel.
           ============================================================ */

        /* ---------- 1. TROIS 6 CONSÉCUTIFS ---------- */
        gameState = createInitialState();
        const joueurDepart3Six = gameState.currentPlayerIndex;
        const positionsDepart3Six = gameState.tokens.map(t => ({
            id: t.id, pos: t.position, state: t.state
        }));

        gameState.consecutiveSixes = 1;
        assertRule(gameState.consecutiveSixes === 1, "après 1 six, compteur = 1");
        assertRule(gameState.currentPlayerIndex === joueurDepart3Six, "après 1 six, même joueur");

        gameState.consecutiveSixes = 2;
        assertRule(gameState.consecutiveSixes === 2, "après 2 six, compteur = 2");
        assertRule(gameState.currentPlayerIndex === joueurDepart3Six, "après 2 six, même joueur");

        gameState.consecutiveSixes = 3;
        gameState.diceValue  = 6;
        gameState.diceRolled = true;
        if (RULES.TROIS_6_TOUR_PERDU && gameState.consecutiveSixes >= 3) {
            gameState.diceValue  = null;
            gameState.diceRolled = false;
            passerAuJoueurSuivant();
            annulerBot();   /* coupe tout timer qu'aurait pu créer planifierTourBot */
        }
        assertRule(gameState.currentPlayerIndex !== joueurDepart3Six, "3 six → le tour passe");
        assertRule(gameState.consecutiveSixes === 0, "consecutiveSixes remis à 0");
        gameState.tokens.forEach(t => {
            const avant = positionsDepart3Six.find(p => p.id === t.id);
            assertRule(t.position === avant.pos, "pion " + t.id + " : position inchangée après 3 six");
            assertRule(t.state === avant.state, "pion " + t.id + " : état inchangé après 3 six");
        });
        assertRule(gameState.winner === null, "aucune défaite après trois 6");
        results.push("Trois 6 : tour passé, aucun pion perdu, aucune défaite");

        /* ---------- 2 + 3 + 4. CASES PROTÉGÉES : toutes paires × 8 cases ---------- */
        const PAIRES_COULEURS = [];
        PLAYER_ORDER.forEach(a => PLAYER_ORDER.forEach(b => {
            if (a !== b) PAIRES_COULEURS.push([a, b]);
        }));
        SAFE_RING_INDEXES.forEach(ringIndex => {
            PAIRES_COULEURS.forEach(function (paire) {
                const attaquant = paire[0];
                const defenseur = paire[1];
                gameState = createInitialState();
                const posDefenseur = (ringIndex - PLAYERS[defenseur].offset + RING.length) % RING.length;
                const posAttaquant = (ringIndex - PLAYERS[attaquant].offset + RING.length) % RING.length;
                setTokenPosition(getToken(defenseur, 0), posDefenseur);
                setTokenPosition(getToken(attaquant, 0), posAttaquant);

                const capture = resoudreCapture(attaquant, posAttaquant);
                assertRule(capture.captures.length === 0,
                    attaquant + " ne doit PAS capturer " + defenseur + " sur ring " + ringIndex);
                assertRule(capture.captureBloqueeParProtection === true,
                    "ring " + ringIndex + " doit être détectée protégée pour " + attaquant);
                assertRule(getToken(defenseur, 0).position === posDefenseur,
                    "pion " + defenseur + " intact sur ring " + ringIndex);
            });
        });
        results.push("8 cases protégées × 12 paires ordonnées = 96 cas : aucune capture");

        /* ---------- 5. CAPTURE NORMALE ---------- */
        gameState = createInitialState();
        setTokenPosition(getToken("red", 0), 18);  /* ring 18 */
        setTokenPosition(getToken("green", 0), 5); /* green 5 → ring 18 */
        assertRule(getRingIndex("green", 5) === 18, "case témoin = ring 18");
        assertRule(!isSafeRingIndex(18), "ring 18 non protégée");
        const capNormale = resoudreCapture("green", 5);
        assertRule(capNormale.captures.length === 1, "1 capture");
        assertRule(capNormale.captures[0].color === "red", "victime = rouge");
        assertRule(getToken("red", 0).position === -1, "rouge renvoyé en base");
        assertRule(getToken("red", 0).state === TOKEN_STATE.BASE, "état BASE");
        assertRule(getToken("green", 0).position === 5, "attaquant inchangé");
        results.push("Capture normale : cible en base, attaquant stable");

        /* ---------- 6. AUTO-CAPTURE INTERDITE ---------- */
        gameState = createInitialState();
        setTokenPosition(getToken("red", 0), 5);
        setTokenPosition(getToken("red", 1), 5);
        const ringAuto = getRingIndex("red", 5);
        assertRule(getRingOccupants(ringAuto).length === 2, "2 rouges sur la case");
        const capAuto = resoudreCapture("red", 5);
        assertRule(capAuto.captures.length === 0, "aucune auto-capture");
        assertRule(getToken("red", 0).position === 5, "pion 0 intact");
        assertRule(getToken("red", 1).position === 5, "pion 1 intact");
        results.push("Auto-capture interdite : pions alliés insensibles");

        /* ---------- 7. BLOCS DE TAILLE 2, 3, 4 ---------- */
        [2, 3, 4].forEach(function (taille) {
            gameState = createInitialState();
            for (let i = 0; i < taille; i++) setTokenPosition(getToken("red", i), 18);
            setTokenPosition(getToken("green", 0), 4);  /* green 4 → ring 17 */
            assertRule(!isLegalMove("green", 0, 1),
                "pion seul ne peut PAS atterrir sur un bloc de " + taille);
            assertRule(getRingOccupants(18).length === taille, "bloc de " + taille + " confirmé");

            setTokenPosition(getToken("green", 0), 3);
            assertRule(!isLegalMove("green", 0, 5),
                "pion seul ne peut PAS traverser un bloc de " + taille);
        });
        results.push("Blocs 2, 3, 4 : atterrissage et traversée refusés pour un pion seul");

        /* ---------- 8. RÈGLE PROJET : PONT PLUS GRAND ---------- */
        /* Case A : pont 3 > bloc 2 → passe */
        gameState = createInitialState();
        setTokenPosition(getToken("green", 0), 5);
        setTokenPosition(getToken("green", 1), 5);
        setTokenPosition(getToken("green", 2), 5);
        setTokenPosition(getToken("red", 0), 19);
        setTokenPosition(getToken("red", 1), 19);
        assertRule(pathIsBlocked("green", 5, 8) === false,
            "CASE A : pont 3 > bloc 2 → traverse autorisé");

        /* Case B : pont 3 == bloc 3 → bloqué */
        gameState = createInitialState();
        setTokenPosition(getToken("green", 0), 5);
        setTokenPosition(getToken("green", 1), 5);
        setTokenPosition(getToken("green", 2), 5);
        setTokenPosition(getToken("red", 0), 19);
        setTokenPosition(getToken("red", 1), 19);
        setTokenPosition(getToken("red", 2), 19);
        assertRule(pathIsBlocked("green", 5, 8) === true,
            "CASE B : pont 3 == bloc 3 → bloqué");

        /* Case C : pont 2 < bloc 3 → bloqué */
        gameState = createInitialState();
        setTokenPosition(getToken("green", 0), 5);
        setTokenPosition(getToken("green", 1), 5);
        setTokenPosition(getToken("red", 0), 19);
        setTokenPosition(getToken("red", 1), 19);
        setTokenPosition(getToken("red", 2), 19);
        assertRule(pathIsBlocked("green", 5, 8) === true,
            "CASE C : pont 2 < bloc 3 → bloqué");

        /* Case D : pont 4 > bloc 3 → passe */
        gameState = createInitialState();
        setTokenPosition(getToken("green", 0), 5);
        setTokenPosition(getToken("green", 1), 5);
        setTokenPosition(getToken("green", 2), 5);
        setTokenPosition(getToken("green", 3), 5);
        setTokenPosition(getToken("red", 0), 19);
        setTokenPosition(getToken("red", 1), 19);
        setTokenPosition(getToken("red", 2), 19);
        assertRule(pathIsBlocked("green", 5, 8) === false,
            "CASE D : pont 4 > bloc 3 → traverse autorisé");
        results.push("Règle pont : A(3>2✅) B(3=3❌) C(2<3❌) D(4>3✅)");

        /* ---------- 9. PONT + ARRIVÉE : ne jamais atterrir sur un pont adverse ---------- */
        gameState = createInitialState();
        setTokenPosition(getToken("green", 0), 5);
        setTokenPosition(getToken("green", 1), 5);
        setTokenPosition(getToken("green", 2), 5);
        setTokenPosition(getToken("green", 3), 5);
        setTokenPosition(getToken("red", 0), 19);
        setTokenPosition(getToken("red", 1), 19);
        assertRule(isLegalMove("green", 0, 1) === false,
            "atterrir sur un pont adverse interdit même avec pont plus grand");
        assertRule(isLegalMove("green", 0, 3) === true,
            "dépasser le pont adverse autorisé");
        results.push("PONT + ARRIVÉE : traverser OK, atterrir TOUJOURS interdit");

        /* ---------- 10. PLUSIEURS BLOCS SUR LE MÊME TRAJET (documentation) ---------- */
        gameState = createInitialState();
        setTokenPosition(getToken("green", 0), 5);
        setTokenPosition(getToken("green", 1), 5);
        setTokenPosition(getToken("green", 2), 5);
        setTokenPosition(getToken("green", 3), 5);
        setTokenPosition(getToken("red", 0), 19);   /* ring 19 = green 6 */
        setTokenPosition(getToken("red", 1), 19);
        setTokenPosition(getToken("red", 2), 20);   /* ring 20 = green 7 */
        setTokenPosition(getToken("red", 3), 20);
        assertRule(pathIsBlocked("green", 5, 10) === false,
            "COMPORTEMENT ACTUEL : pont de 4 franchit DEUX blocs de 2 sur le même trajet");
        results.push("Plusieurs blocs : tous franchis si pont strictement plus grand (documenté)");

        /* ---------- 11. SORTIE DE BASE ---------- */
        [1, 2, 3, 4, 5].forEach(function (dice) {
            gameState = createInitialState();
            assertRule(!isLegalMove("red", 0, dice),
                "sortie base refusée avec " + dice);
        });
        gameState = createInitialState();
        assertRule(isLegalMove("red", 0, 6), "sortie base autorisée avec 6");
        assertRule(tokensOf("red").every(t => t.position === -1), "4 pions rouge en base");
        [0, 1, 2, 3].forEach(function (idx) {
            assertRule(isLegalMove("red", idx, 6), "pion " + idx + " peut sortir avec un 6");
        });
        results.push("Sortie de base : uniquement sur 6, pour chacun des 4 pions");

        /* ---------- 12. DÉPASSEMENT / ARRIVÉE EXACTE ---------- */
        gameState = createInitialState();
        setTokenPosition(getToken("red", 0), 55);
        assertRule(isLegalMove("red", 0, 1), "55 + 1 = 56 : OK");
        assertRule(!isLegalMove("red", 0, 2), "55 + 2 = 57 : refusé");
        setTokenPosition(getToken("red", 0), 50);
        assertRule(isLegalMove("red", 0, 6), "50 + 6 = 56 : OK");
        assertRule(!isLegalMove("red", 0, 7), "50 + 7 = 57 : refusé");
        setTokenPosition(getToken("red", 0), FINISH_POSITION);
        assertRule(!isLegalMove("red", 0, 1), "pion arrivé : immobile");
        results.push("Dépassement arrivée : interdit ; arrivée exacte : OK");

        /* ---------- 13. VICTOIRE ---------- */
        gameState = createInitialState();
        setTokenPosition(getToken("red", 0), FINISH_POSITION);
        setTokenPosition(getToken("red", 1), FINISH_POSITION);
        setTokenPosition(getToken("red", 2), FINISH_POSITION);
        assertRule(!verifierVictoire("red"), "3 pions ≠ victoire");
        assertRule(nombreArrives("red") === 3, "compteur = 3");
        setTokenPosition(getToken("red", 3), FINISH_POSITION);
        assertRule(verifierVictoire("red"), "4 pions = victoire");
        assertRule(nombreArrives("red") === 4, "compteur = 4");
        assertRule(!verifierVictoire("green"), "vert pas gagnant");
        assertRule(!verifierVictoire("blue"), "bleu pas gagnant");
        assertRule(!verifierVictoire("yellow"), "jaune pas gagnant");
        results.push("Victoire : 3 = false, 4 = true, autres couleurs intactes");

        /* ---------- 14. IDENTITÉ APRÈS MOUVEMENTS / CAPTURES ---------- */
        gameState = createInitialState();
        setTokenPosition(getToken("red", 0), 3);
        setTokenPosition(getToken("green", 0), 4);
        resoudreCapture("green", 4);
        setTokenPosition(getToken("blue", 0), 30);
        setTokenPosition(getToken("yellow", 0), 40);
        const couleursOriginales = {};
        gameState.tokens.forEach(function (t) {
            if (!couleursOriginales[t.id]) couleursOriginales[t.id] = t.color;
            assertRule(t.id === t.color + "-" + t.tokenIndex, "id stable " + t.id);
            assertRule(t.color === t.player, "color == player " + t.id);
            assertRule(couleursOriginales[t.id] === t.color, "couleur immuable " + t.id);
        });
        assertRule(tokensOf("red").length === 4, "4 rouges");
        assertRule(tokensOf("green").length === 4, "4 verts");
        assertRule(tokensOf("blue").length === 4, "4 bleus");
        assertRule(tokensOf("yellow").length === 4, "4 jaunes");
        results.push("Identité : 16 pions, couleurs immuables après déplacements/captures");

        /* ---------- 15. REDÉMARRAGE : état initial propre ---------- */
        const etatFrais = createInitialState();
        assertRule(etatFrais.tokens.length === 16, "16 pions");
        assertRule(etatFrais.tokens.every(t => t.position === -1 && t.state === TOKEN_STATE.BASE),
            "tous en base");
        assertRule(etatFrais.currentPlayerIndex === 0, "joueur 0");
        assertRule(etatFrais.diceValue === null, "diceValue null");
        assertRule(etatFrais.diceRolled === false, "diceRolled false");
        assertRule(etatFrais.consecutiveSixes === 0, "consecutiveSixes 0");
        assertRule(etatFrais.winner === null, "winner null");
        assertRule(etatFrais.history.length === 0, "historique vide");
        assertRule(etatFrais.legalMoves.length === 0, "legalMoves vide");
        assertRule(etatFrais.isRolling === false, "isRolling false");
        assertRule(etatFrais.isAnimatingMove === false, "isAnimatingMove false");
        assertRule(etatFrais.isBotThinking === false, "isBotThinking false");
        assertRule(etatFrais.lastRollWasSix === false, "lastRollWasSix false");
        results.push("Redémarrage : état initial propre (pions, verrous, historique, dé)");

        /* ---------- 17. INTERPRÉTATION DU PONT (documentée) ---------- */
        gameState = createInitialState();
        setTokenPosition(getToken("green", 0), 5);
        setTokenPosition(getToken("green", 1), 5);
        setTokenPosition(getToken("green", 2), 5);
        setTokenPosition(getToken("green", 3), 5);
        setTokenPosition(getToken("red", 0), 19);
        setTokenPosition(getToken("red", 1), 19);
        setTokenPosition(getToken("red", 2), 19);
        assertRule(tailleDePontSurPosition("green", 5) === 4,
            "pont mesuré AVANT déplacement = 4");
        assertRule(pathIsBlocked("green", 5, 8) === false,
            "un pont de 4 franchit un bloc de 3 (mesure AVANT départ)");
        results.push("Interprétation du pont : mesuré AVANT déplacement (comportement documenté)");

        console.log("%c✓ MOTEUR LUDO — tous les tests passent", "color:#43A047;font-weight:bold");
        results.forEach(r => console.log("   ✓ " + r));
    } catch (error) {
        console.error("%c✗ MOTEUR LUDO — " + error.message, "color:#E53935;font-weight:bold");
    } finally {
        gameState = saved;
    }
}


/* ============================================================
   23. INITIALISATION
   ============================================================ */

recommencerPartie();
runEngineTests();
runBotTests();

console.log("LUDO — règles actives :");
console.log("  • sortie de base uniquement avec un 6");
console.log("  • un 6 donne un lancer supplémentaire");
console.log("  • une capture donne un lancer supplémentaire");
console.log("  • un pion amené à l'arrivée donne un lancer supplémentaire");
console.log("  • 8 cases sûres : 4 étoiles + 4 cases de départ colorées");
console.log("  • 2 pions de même couleur = blocage infranchissable");
console.log("  • trois 6 d'affilée : le tour passe, AUCUN pion perdu, AUCUN coup annulé");
console.log("  • arrivée au nombre exact, victoire avec 4 pions arrivés");
