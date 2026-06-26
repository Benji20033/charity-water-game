const TOTAL_COLUMNS = 4;
const MAX_LIVES = 3;
const SPAWN_INTERVAL = 1100;
const TRASH_SPEED_MIN = 1.6;
const TRASH_SPEED_MAX = 2.4;
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
const restartBtn = document.getElementById('restart-btn');

let gameState = {
    score: 0,
    lives: MAX_LIVES,
    playerColumn: 1,
    gameOver: false,
    paused: false,
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
            if (!gameState.gameOver && !gameState.paused) {
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

function createSpawnItem() {
    if (gameState.gameOver || gameState.paused) {
        return;
    }

    const column = Math.floor(Math.random() * TOTAL_COLUMNS);
    const isBonus = Math.random() < BONUS_SPAWN_CHANCE;
    const item = document.createElement('img');
    item.src = isBonus ? 'img/water-can-transparent.png' : 'game/trash.PNG';
    item.className = isBonus ? 'trash can' : 'trash';
    item.dataset.column = column;
    item.dataset.type = isBonus ? 'can' : 'trash';
    item.dataset.y = '0';
    item.dataset.speed = (TRASH_SPEED_MIN + Math.random() * (TRASH_SPEED_MAX - TRASH_SPEED_MIN)).toString();
    item.style.left = `calc(${column * (100 / TOTAL_COLUMNS)}% + ${100 / TOTAL_COLUMNS / 2}%)`;
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
    clearInterval(spawnTimer);
    cleanupTrash();

    setTimeout(() => {
        if (gameState.gameOver) {
            return;
        }
        gameState.paused = false;
        messageEl.textContent = 'Move the player to catch trash before it lands in the pond.';
        spawnTimer = window.setInterval(createSpawnItem, SPAWN_INTERVAL);
    }, 1300);
}

function cleanupTrash() {
    trashObjects.forEach((trash) => trash.element.remove());
    trashObjects = [];
}

function endGame() {
    gameState.gameOver = true;
    clearInterval(spawnTimer);
    messageEl.textContent = 'Game over! Tap Restart to play again.';
    restartBtn.classList.remove('hidden');
}

function restartGame() {
    gameState = {
        score: 0,
        lives: MAX_LIVES,
        playerColumn: 1,
        gameOver: false,
        paused: false,
    };
    cleanupTrash();
    updateHud();
    updatePlayerPosition();
    highlightActiveColumn();
    messageEl.textContent = 'Move the player to catch trash before it lands in the pond.';
    restartBtn.classList.add('hidden');
    spawnTimer = window.setInterval(createSpawnItem, SPAWN_INTERVAL);
}

function gameLoop() {
    const areaHeight = gameArea.clientHeight;
    const pondHeight = gameArea.querySelector('.pond-wrapper').clientHeight;
    const catchThreshold = areaHeight - pondHeight - 48;
    const missThreshold = areaHeight - 8;

    trashObjects.slice().forEach((trash) => {
        trash.y += trash.speed;
        trash.element.style.top = `${trash.y}px`;

        const reachedCatch = trash.y >= catchThreshold;
        const reachedMiss = trash.y >= missThreshold;

        if (reachedCatch) {
            if (trash.column === gameState.playerColumn) {
                catchTrash(trash);
                return;
            }
        }

        if (reachedMiss) {
            missTrash(trash);
        }
    });

    animationFrame = window.requestAnimationFrame(gameLoop);
}

function bindControls() {
    leftBtn.addEventListener('click', () => setPlayerColumn(gameState.playerColumn - 1));
    rightBtn.addEventListener('click', () => setPlayerColumn(gameState.playerColumn + 1));
    restartBtn.addEventListener('click', restartGame);

    window.addEventListener('keydown', (event) => {
        if (gameState.gameOver || gameState.paused) {
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
    spawnTimer = window.setInterval(createSpawnItem, SPAWN_INTERVAL);
    animationFrame = window.requestAnimationFrame(gameLoop);
}

initGame();
