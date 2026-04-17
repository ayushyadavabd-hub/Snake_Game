const board = document.querySelector(".board");
const scoreElement = document.getElementById("score");
const highScoreElement = document.getElementById("high-score");
const timeElement = document.getElementById("time");
const overlay = document.getElementById("overlay");
const restartButton = document.getElementById("restart-btn");
const controlButtons = document.querySelectorAll(".control-btn");

const GRID_SIZE = 20;
const CELL_COUNT = GRID_SIZE * GRID_SIZE;
const BASE_SPEED = 140;
const MIN_SPEED = 70;
const SPEED_STEP = 3;
const SPEED_EASING = 0.08;

const gameState = {
  snake: [],
  direction: { row: 0, col: 1 },
  nextDirection: { row: 0, col: 1 },
  food: null,
  score: 0,
  highScore: Number(localStorage.getItem("snake-high-score") || 0),
  seconds: 0,
  isRunning: true,
  timerId: null,
  currentSpeed: BASE_SPEED,
  targetSpeed: BASE_SPEED,
  lastFrameTime: 0,
  moveAccumulator: 0,
  cells: [],
};

function createBoard() {
  board.innerHTML = "";
  board.style.gridTemplateColumns = `repeat(${GRID_SIZE}, 1fr)`;
  board.style.gridTemplateRows = `repeat(${GRID_SIZE}, 1fr)`;

  gameState.cells = [];

  for (let index = 0; index < CELL_COUNT; index += 1) {
    const cell = document.createElement("div");
    cell.className = "block";
    cell.dataset.index = String(index);
    board.appendChild(cell);
    gameState.cells.push(cell);
  }
}

function positionToIndex(position) {
  return position.row * GRID_SIZE + position.col;
}

function isInsideBoard(position) {
  return (
    position.row >= 0 &&
    position.row < GRID_SIZE &&
    position.col >= 0 &&
    position.col < GRID_SIZE
  );
}

function randomEmptyCell() {
  const occupied = new Set(gameState.snake.map(positionToIndex));
  let candidateIndex = Math.floor(Math.random() * CELL_COUNT);

  while (occupied.has(candidateIndex)) {
    candidateIndex = Math.floor(Math.random() * CELL_COUNT);
  }

  return {
    row: Math.floor(candidateIndex / GRID_SIZE),
    col: candidateIndex % GRID_SIZE,
  };
}

function updateHud() {
  scoreElement.textContent = String(gameState.score);
  highScoreElement.textContent = String(gameState.highScore);
  const minutes = String(Math.floor(gameState.seconds / 60)).padStart(2, "0");
  const seconds = String(gameState.seconds % 60).padStart(2, "0");
  timeElement.textContent = `${minutes}:${seconds}`;
}

function resetBoardClasses() {
  for (const cell of gameState.cells) {
    cell.className = "block";
  }
}

function render() {
  resetBoardClasses();

  const foodIndex = positionToIndex(gameState.food);
  gameState.cells[foodIndex].classList.add("food");

  gameState.snake.forEach((segment, index) => {
    const cell = gameState.cells[positionToIndex(segment)];
    cell.classList.add(index === 0 ? "snake-head" : "snake-body");
  });
}

function spawnFood() {
  gameState.food = randomEmptyCell();
}

function setDirection(rowDelta, colDelta) {
  const current = gameState.direction;
  const next = { row: rowDelta, col: colDelta };
  const isReverse =
    current.row + next.row === 0 && current.col + next.col === 0;

  if (!isReverse) {
    gameState.nextDirection = next;
  }
}

function handleInput(key) {
  const map = {
    ArrowUp: [-1, 0],
    ArrowDown: [1, 0],
    ArrowLeft: [0, -1],
    ArrowRight: [0, 1],
    w: [-1, 0],
    s: [1, 0],
    a: [0, -1],
    d: [0, 1],
  };

  const normalized = map[key] || map[key.toLowerCase()];
  if (!normalized) {
    return;
  }

  setDirection(normalized[0], normalized[1]);
}

function endGame() {
  gameState.isRunning = false;
  clearInterval(gameState.timerId);
  overlay.classList.remove("hidden");

  if (gameState.score > gameState.highScore) {
    gameState.highScore = gameState.score;
    localStorage.setItem("snake-high-score", String(gameState.highScore));
  }

  updateHud();
}

function moveSnake() {
  if (!gameState.isRunning) {
    return;
  }

  gameState.direction = gameState.nextDirection;

  const head = gameState.snake[0];
  const nextHead = {
    row: head.row + gameState.direction.row,
    col: head.col + gameState.direction.col,
  };

  if (!isInsideBoard(nextHead)) {
    const hitCell = gameState.cells[positionToIndex(head)];
    hitCell.classList.add("wall-hit");
    endGame();
    return;
  }

  const selfHit = gameState.snake.some(
    (segment) => segment.row === nextHead.row && segment.col === nextHead.col
  );
  if (selfHit) {
    const hitCell = gameState.cells[positionToIndex(head)];
    hitCell.classList.add("self-hit");
    endGame();
    return;
  }

  gameState.snake.unshift(nextHead);

  const ateFood =
    nextHead.row === gameState.food.row && nextHead.col === gameState.food.col;
  if (ateFood) {
    gameState.score += 10;
    gameState.targetSpeed = Math.max(
      MIN_SPEED,
      BASE_SPEED - gameState.score * SPEED_STEP
    );
    spawnFood();
  } else {
    gameState.snake.pop();
  }

  updateHud();
  render();
}

function startTimers() {
  clearInterval(gameState.timerId);

  gameState.timerId = setInterval(() => {
    if (!gameState.isRunning) {
      return;
    }
    gameState.seconds += 1;
    updateHud();
  }, 1000);
}

function resetGame() {
  gameState.snake = [
    { row: 10, col: 8 },
    { row: 10, col: 7 },
    { row: 10, col: 6 },
  ];
  gameState.direction = { row: 0, col: 1 };
  gameState.nextDirection = { row: 0, col: 1 };
  gameState.score = 0;
  gameState.seconds = 0;
  gameState.currentSpeed = BASE_SPEED;
  gameState.targetSpeed = BASE_SPEED;
  gameState.lastFrameTime = 0;
  gameState.moveAccumulator = 0;
  gameState.isRunning = true;
  overlay.classList.add("hidden");

  if (gameState.score > gameState.highScore) {
    gameState.highScore = gameState.score;
    localStorage.setItem("snake-high-score", String(gameState.highScore));
  }

  spawnFood();
  updateHud();
  render();
  startTimers();
}

function updateSpeed(deltaTime) {
  const speedGap = gameState.targetSpeed - gameState.currentSpeed;
  gameState.currentSpeed += speedGap * SPEED_EASING;

  if (Math.abs(speedGap) < 0.15) {
    gameState.currentSpeed = gameState.targetSpeed;
  }

  gameState.moveAccumulator += deltaTime;

  while (
    gameState.isRunning &&
    gameState.moveAccumulator >= gameState.currentSpeed
  ) {
    moveSnake();
    gameState.moveAccumulator -= gameState.currentSpeed;
  }
}

function gameLoop(timestamp) {
  if (!gameState.lastFrameTime) {
    gameState.lastFrameTime = timestamp;
  }

  const deltaTime = timestamp - gameState.lastFrameTime;
  gameState.lastFrameTime = timestamp;

  if (gameState.isRunning) {
    updateSpeed(deltaTime);
  }

  requestAnimationFrame(gameLoop);
}

function bindEvents() {
  window.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !gameState.isRunning) {
      resetGame();
      return;
    }
    handleInput(event.key);
  });

  controlButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const direction = button.dataset.direction;
      handleInput(direction);
    });
  });

  restartButton.addEventListener("click", resetGame);
}

createBoard();
bindEvents();
resetGame();
requestAnimationFrame(gameLoop);
