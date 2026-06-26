const TOTAL_COLUMNS = 4;
const MAX_LIVES = 3;
const SPAWN_INTERVAL = 1100;
const SPAWN_INTERVAL_MIN = 500;
const DIFFICULTY_STEP_POINTS = 60;
const TRASH_SPEED_MIN = 1.6;
const TRASH_SPEED_MAX = 2.4;
const TRASH_SPEED_MIN_MAX = 2.3;
const TRASH_SPEED_MAX_MAX = 3.2;
const BONUS_SPAWN_CHANCE = 0.16;
const TRASH_POINTS = 10;
const BONUS_POINTS = 25;

const gameArea = document.getElementById('game-area');
const columnsEl = document.getElementById('columns');
const trashLayer = document.getElementById('trash-layer');
const playerEl = document.getElementById('player');
const scoreValue = document.querySelector('.score-value');
const livesValue = document.querySelector('.lives-value');
const messageEl = document.getElementById('game-message');
const leftBtn = document.getElementById('left-btn');
const rightBtn = document.getElementById('right-btn');
const startBtn = document.getElementById('start-btn');
const pauseBtn = document.getElementById('pause-btn');
const restartBtn = document.getElementById('restart-btn');

let gameState = {
    score: 0,
    lives: MAX_LIVES,
    playerColumn: 1,
    gameOver: false,
    paused: false,
    started: false,
    userPaused: false,
};

let trashObjects = [];
let spawnTimer = null;
let animationFrame = null;

function createColumns() {
    for (let index = 0; index < TOTAL_COLUMNS; index += 1) {
        const column = document.createElement('button');
        column.type = 'button';
        column.className = 'column';
        column.dataset.col = index;
        column.innerHTML = `<img class="window-image" src="game/window.PNG" alt="Window">`;
        column.addEventListener('click', () => {
            if (gameState.started && !gameState.gameOver && !gameState.paused && !gameState.userPaused) {
                setPlayerColumn(index);
            }
        });
        columnsEl.appendChild(column);
    }
}

function setPlayerColumn(column) {
    gameState.playerColumn = Math.max(0, Math.min(TOTAL_COLUMNS - 1, column));
    updatePlayerPosition();
    highlightActiveColumn();
}

function updatePlayerPosition() {
    const columnWidth = 100 / TOTAL_COLUMNS;
    const leftPercent = gameState.playerColumn * columnWidth + columnWidth / 2;
    playerEl.style.left = `${leftPercent}%`;
}

function highlightActiveColumn() {
    const columnButtons = columnsEl.querySelectorAll('.column');
    columnButtons.forEach((button, index) => {
        button.classList.toggle('active', index === gameState.playerColumn);
    });
}

function updateHud() {
    scoreValue.textContent = gameState.score;
    livesValue.textContent = gameState.lives;
}

function updateControlButtons() {
    const canPlay = gameState.started && !gameState.gameOver && !gameState.paused && !gameState.userPaused;

    leftBtn.disabled = !canPlay;
    rightBtn.disabled = !canPlay;
    pauseBtn.disabled = !gameState.started || gameState.gameOver;
    pauseBtn.textContent = gameState.userPaused ? 'Resume' : 'Pause';
    startBtn.textContent = gameState.gameOver || !gameState.started ? 'Start' : 'Restart';
}

function getDifficultyLevel() {
    return Math.floor(gameState.score / DIFFICULTY_STEP_POINTS);
}

function getSpawnDelay() {
    const difficultyLevel = getDifficultyLevel();
    const baseDelay = Math.max(SPAWN_INTERVAL_MIN, SPAWN_INTERVAL - difficultyLevel * 75);
    const jitter = Math.random() * 90 - 45;
    return Math.max(360, baseDelay + jitter);
}

function getTrashSpeedRange() {
    const difficultyLevel = getDifficultyLevel();
    const progress = Math.min(1, difficultyLevel / 8);

    return {
        min: TRASH_SPEED_MIN + progress * 0.7,
        max: TRASH_SPEED_MAX + progress * 0.8,
    };
}

function scheduleNextSpawn() {
    if (!gameState.started || gameState.gameOver || gameState.paused || gameState.userPaused) {
        return;
    }

    clearTimeout(spawnTimer);
    spawnTimer = window.setTimeout(() => {
        if (!gameState.gameOver && !gameState.paused) {
            createSpawnItem();
        }
        scheduleNextSpawn();
    }, getSpawnDelay());
}

function createSpawnItem() {
    if (!gameState.started || gameState.gameOver || gameState.paused || gameState.userPaused) {
        return;
    }

    const column = Math.floor(Math.random() * TOTAL_COLUMNS);
    const isBonus = Math.random() < BONUS_SPAWN_CHANCE;
    const speedRange = getTrashSpeedRange();
    const item = document.createElement('img');
    item.src = isBonus ? 'img/water-can-transparent.png' : 'game/trash.PNG';
    item.className = isBonus ? 'trash can' : 'trash';
    item.dataset.column = column;
    item.dataset.type = isBonus ? 'can' : 'trash';
    item.dataset.y = '0';
    item.dataset.speed = (speedRange.min + Math.random() * (speedRange.max - speedRange.min)).toString();
    item.style.left = `calc(${column * (100 / TOTAL_COLUMNS)}% + ${100 / TOTAL_COLUMNS / 2}%)`;
    item.style.top = '0px';
    item.style.transform = 'translateX(-50%)';
    trashLayer.appendChild(item);

    trashObjects.push({
        element: item,
        column,
        y: 0,
        speed: parseFloat(item.dataset.speed),
        type: isBonus ? 'can' : 'trash',
    });
}

function removeTrash(trash) {
    trash.element.remove();
    trashObjects = trashObjects.filter((item) => item !== trash);
}

function catchTrash(trash) {
    removeTrash(trash);
    const caughtBonus = trash.type === 'can';
    gameState.score += caughtBonus ? BONUS_POINTS : TRASH_POINTS;
    messageEl.textContent = caughtBonus
        ? 'Great job! You collected a bonus water can.'
        : 'Nice catch! Keep the pond clean.';
    updateHud();
}

function missTrash(trash) {
    removeTrash(trash);
    if (gameState.gameOver || gameState.paused) {
        return;
    }

    if (trash.type === 'can') {
        gameState.score += BONUS_POINTS;
        updateHud();
        return;
    }

    gameState.lives -= 1;
    updateHud();

    if (gameState.lives <= 0) {
        endGame();
    } else {
        pauseRound('Oops! Trash hit the pond. Keep going.');
    }
}

function pauseRound(message) {
    if (gameState.gameOver) {
        return;
    }

    gameState.paused = true;
    messageEl.textContent = message;
    clearTimeout(spawnTimer);
    cleanupTrash();

    window.setTimeout(() => {
        if (gameState.gameOver) {
            return;
        }
        gameState.paused = false;
        messageEl.textContent = 'Move the player to catch trash before it lands in the pond.';
        scheduleNextSpawn();
    }, 1300);
}

function cleanupTrash() {
    trashObjects.forEach((trash) => trash.element.remove());
    trashObjects = [];
}

function endGame() {
    gameState.gameOver = true;
    clearTimeout(spawnTimer);
    cleanupTrash();
    messageEl.textContent = 'Game over! Tap Restart to play again.';
    restartBtn.classList.remove('hidden');
}

function restartGame() {
    clearTimeout(spawnTimer);
    gameState = {
        score: 0,
        lives: MAX_LIVES,
        playerColumn: 1,
        gameOver: false,
        paused: false,
        started: true,
        userPaused: false,
    };
    cleanupTrash();
    updateHud();
    updatePlayerPosition();
    highlightActiveColumn();
    messageEl.textContent = 'Move the player to catch trash before it lands in the pond.';
    restartBtn.classList.add('hidden');
    updateControlButtons();
    scheduleNextSpawn();
}

function isCollidingWithPlayer(trash) {
    const playerRect = playerEl.getBoundingClientRect();
    const trashRect = trash.element.getBoundingClientRect();

    return trashRect.left < playerRect.right
        && trashRect.right > playerRect.left
        && trashRect.top < playerRect.bottom
        && trashRect.bottom > playerRect.top;
}

function togglePause() {
    if (!gameState.started || gameState.gameOver) {
        return;
    }

    gameState.userPaused = !gameState.userPaused;

    if (gameState.userPaused) {
        clearTimeout(spawnTimer);
        gameState.paused = true;
        messageEl.textContent = 'Paused. Press Pause to continue.';
    } else {
        gameState.paused = false;
        messageEl.textContent = 'Move the player to catch trash before it lands in the pond.';
        scheduleNextSpawn();
    }

    updateControlButtons();
}

function gameLoop() {
    if (!gameState.started || gameState.gameOver || gameState.paused || gameState.userPaused) {
        animationFrame = window.requestAnimationFrame(gameLoop);
        return;
    }

    const areaHeight = gameArea.clientHeight;
    const missThreshold = areaHeight - 8;

    trashObjects.slice().forEach((trash) => {
        trash.y += trash.speed;
        trash.element.style.top = `${trash.y}px`;

        if (isCollidingWithPlayer(trash)) {
            catchTrash(trash);
            return;
        }

        const reachedMiss = trash.y >= missThreshold;

        if (reachedMiss) {
            missTrash(trash);
        }
    });

    animationFrame = window.requestAnimationFrame(gameLoop);
}

function bindControls() {
    startBtn.addEventListener('click', () => {
        if (gameState.userPaused) {
            togglePause();
            return;
        }
        restartGame();
    });

    pauseBtn.addEventListener('click', togglePause);
    leftBtn.addEventListener('click', () => setPlayerColumn(gameState.playerColumn - 1));
    rightBtn.addEventListener('click', () => setPlayerColumn(gameState.playerColumn + 1));
    restartBtn.addEventListener('click', restartGame);

    window.addEventListener('keydown', (event) => {
        if (gameState.gameOver || gameState.paused || gameState.userPaused || !gameState.started) {
            return;
        }

        if (event.key === 'ArrowLeft') {
            setPlayerColumn(gameState.playerColumn - 1);
        } else if (event.key === 'ArrowRight') {
            setPlayerColumn(gameState.playerColumn + 1);
        }
    });
}

function initGame() {
    createColumns();
    bindControls();
    updatePlayerPosition();
    highlightActiveColumn();
    updateHud();
    updateControlButtons();
    messageEl.textContent = 'Press Start to begin catching trash.';
    animationFrame = window.requestAnimationFrame(gameLoop);
}

initGame();
