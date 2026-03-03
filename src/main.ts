import { fromKey, parseLevel, type GameState, type Tile, toKey } from './core/parse.js';
import { createRenderer, type RenderMotion, type SpriteMotion } from './render/canvas.js';
import {
  applyHistoryMove,
  createHistory,
  type HistoryState,
  redoHistory,
  restartHistory,
  undoHistory,
} from './core/history.js';
import type { Direction } from './core/move.js';
import {
  getDateSelection,
  getTimeUntilLocalMidnight,
  hashDateKeyToIndex,
} from './core/daily.js';
import {
  buildShareText,
  ensureDailyAttempt,
  getDailyRecord,
  incrementAttempts,
  loadStats,
  recordSolved,
  saveStats,
  summarizeStats,
  type StatsStore,
} from './core/stats.js';
import { levelPack } from './levels/pack.js';

function requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);

  if (!element) {
    throw new Error(`Required element "${selector}" was not found.`);
  }

  return element;
}

const canvas = requireElement<HTMLCanvasElement>('#game');
const dailyMeta = requireElement<HTMLParagraphElement>('#daily-meta');
const dateNotice = requireElement<HTMLParagraphElement>('#date-notice');
const statusText = requireElement<HTMLParagraphElement>('#status-text');
const countdownText = requireElement<HTMLParagraphElement>('#countdown-text');
const overlay = requireElement<HTMLDivElement>('#solved-overlay');
const overlayStats = requireElement<HTMLParagraphElement>('#overlay-stats');
const overlayCountdown =
  requireElement<HTMLParagraphElement>('#overlay-countdown');
const undoButton = requireElement<HTMLButtonElement>('#undo-button');
const redoButton = requireElement<HTMLButtonElement>('#redo-button');
const restartButton = requireElement<HTMLButtonElement>('#restart-button');
const statsButton = requireElement<HTMLButtonElement>('#stats-button');
const shareButton = requireElement<HTMLButtonElement>('#share-button');
const animationToggle =
  requireElement<HTMLButtonElement>('#animation-toggle');
const statsModal = requireElement<HTMLDivElement>('#stats-modal');
const closeStatsButton =
  requireElement<HTMLButtonElement>('#close-stats-button');
const statsTotalSolved =
  requireElement<HTMLSpanElement>('#stats-total-solved');
const statsCurrentStreak =
  requireElement<HTMLSpanElement>('#stats-current-streak');
const statsBestStreak =
  requireElement<HTMLSpanElement>('#stats-best-streak');

const keymap: Record<string, Direction> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  KeyW: 'up',
  KeyA: 'left',
  KeyS: 'down',
  KeyD: 'right',
};

const dateSelection = getDateSelection(window.location.search);
const dateKey = dateSelection.dateKey;
const puzzleIndex = hashDateKeyToIndex(dateKey, levelPack.length);
const animationDurationMs = 120;
const levelSource = levelPack[puzzleIndex];
const storage = typeof window !== 'undefined' ? window.localStorage : null;

let history = createHistory(parseLevel(levelSource));
const render = createRenderer(canvas, 64);
let countdownTimerId: number | null = null;
let animationFrameId: number | null = null;
let animationsEnabled = true;
let currentMotion: RenderMotion | null = null;
let stats: StatsStore = ensureDailyAttempt(loadStats(storage), dateKey);
let dragState:
  | {
      pointerId: number;
      lastX: number;
      lastY: number;
    }
  | null = null;

saveStats(storage, stats);

function compareTiles(a: Tile, b: Tile): number {
  return a.y - b.y || a.x - b.x;
}

function stopAnimation() {
  if (animationFrameId !== null) {
    window.cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }

  currentMotion = null;
}

function getCrateMotions(previous: GameState, next: GameState): SpriteMotion[] {
  const removed = [...previous.crates]
    .filter((key) => !next.crates.has(key))
    .map((key) => fromKey(key))
    .sort(compareTiles);
  const added = [...next.crates]
    .filter((key) => !previous.crates.has(key))
    .map((key) => fromKey(key))
    .sort(compareTiles);
  const crateMotions: SpriteMotion[] = [];

  for (let index = 0; index < Math.min(removed.length, added.length); index += 1) {
    crateMotions.push({
      from: removed[index],
      to: added[index],
    });
  }

  return crateMotions;
}

function getMotion(previous: GameState, next: GameState): Omit<RenderMotion, 'progress'> | null {
  const playerMoved = toKey(previous.player) !== toKey(next.player);
  const crates = getCrateMotions(previous, next);

  if (!playerMoved && crates.length === 0) {
    return null;
  }

  return {
    player: {
      from: previous.player,
      to: next.player,
    },
    crates,
  };
}

function updateCountdown() {
  const countdown = getTimeUntilLocalMidnight();
  countdownText.textContent = `Next puzzle in ${countdown}`;
  overlayCountdown.textContent = `Next puzzle in ${countdown}`;
}

function updateStatsModal() {
  const summary = summarizeStats(stats, dateKey);
  statsTotalSolved.textContent = String(summary.totalSolved);
  statsCurrentStreak.textContent = String(summary.currentStreak);
  statsBestStreak.textContent = String(summary.bestStreak);
}

function setStatsModalVisible(isVisible: boolean) {
  statsModal.classList.toggle('is-visible', isVisible);
  statsModal.setAttribute('aria-hidden', String(!isVisible));
}

function persistStats(nextStats: StatsStore) {
  stats = nextStats;
  saveStats(storage, stats);
  updateStatsModal();
}

async function copyShareText() {
  const record = getDailyRecord(stats, dateKey);
  const shareText = buildShareText({
    dateKey,
    puzzleNumber: puzzleIndex + 1,
    moves: history.present.moveCount,
    bestMoves: record.bestMoves,
    level: levelSource,
  });

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(shareText);
      shareButton.textContent = 'Copied';
    } else {
      shareButton.textContent = 'Clipboard unavailable';
    }
  } catch {
    shareButton.textContent = 'Copy failed';
  }

  window.setTimeout(() => {
    shareButton.textContent = 'Copy share';
  }, 1000);
}

function syncSolveStats() {
  let record = getDailyRecord(stats, dateKey);

  if (
    history.present.isWin &&
    (record.bestMoves === null || history.present.moveCount < record.bestMoves || !record.solved)
  ) {
    persistStats(recordSolved(stats, dateKey, history.present.moveCount));
    record = getDailyRecord(stats, dateKey);
  }

  overlayStats.textContent = `Best: ${record.bestMoves ?? '--'} | Attempts: ${record.attempts}`;
}

function draw() {
  const { present, past } = history;

  render(present, currentMotion ?? undefined);
  dailyMeta.textContent = `Date: ${dateKey} | Puzzle #${puzzleIndex + 1}`;
  if (dateSelection.invalidOverride) {
    dateNotice.hidden = false;
    dateNotice.textContent =
      `Ignoring invalid ?date=${dateSelection.invalidOverride}; showing today's puzzle instead.`;
  } else {
    dateNotice.hidden = true;
    dateNotice.textContent = '';
  }
  statusText.textContent = present.isWin
    ? `Moves: ${present.moveCount} | Undo: ${past.length} | Solved`
    : `Moves: ${present.moveCount} | Undo: ${past.length}`;
  overlay.classList.toggle('is-visible', present.isWin);
  animationToggle.textContent = animationsEnabled ? 'On' : 'Off';
  animationToggle.setAttribute('aria-pressed', String(animationsEnabled));
  syncSolveStats();
}

function animateTransition(previous: GameState, next: GameState) {
  stopAnimation();

  if (!animationsEnabled) {
    draw();
    return;
  }

  const motion = getMotion(previous, next);

  if (!motion) {
    draw();
    return;
  }

  const startTime = window.performance.now();

  const step = (timestamp: number) => {
    const progress = Math.min(
      1,
      (timestamp - startTime) / animationDurationMs,
    );

    currentMotion = {
      ...motion,
      progress,
    };
    draw();

    if (progress < 1) {
      animationFrameId = window.requestAnimationFrame(step);
      return;
    }

    animationFrameId = null;
    currentMotion = null;
    draw();
  };

  currentMotion = {
    ...motion,
    progress: 0,
  };
  draw();
  animationFrameId = window.requestAnimationFrame(step);
}

function commitHistory(nextHistory: HistoryState) {
  if (nextHistory === history) {
    return false;
  }

  const previous = history.present;
  history = nextHistory;
  animateTransition(previous, history.present);
  return true;
}

function runUndo() {
  commitHistory(undoHistory(history));
}

function runRedo() {
  commitHistory(redoHistory(history));
}

function runRestart() {
  persistStats(incrementAttempts(stats, dateKey));
  commitHistory(restartHistory(history));
}

window.addEventListener('keydown', (event) => {
  if (event.code === 'KeyR') {
    event.preventDefault();
    runRestart();
    return;
  }

  if (event.code === 'Backspace' || event.code === 'KeyZ') {
    event.preventDefault();
    if (event.shiftKey) {
      runRedo();
      return;
    }

    runUndo();
    return;
  }

  if (event.code === 'KeyY') {
    event.preventDefault();
    runRedo();
    return;
  }

  const direction = keymap[event.code] ?? keymap[event.key];

  if (!direction) {
    return;
  }

  event.preventDefault();
  commitHistory(applyHistoryMove(history, direction));
});

function getCanvasPoint(event: PointerEvent): Tile | null {
  const rect = canvas.getBoundingClientRect();

  if (
    event.clientX < rect.left ||
    event.clientX > rect.right ||
    event.clientY < rect.top ||
    event.clientY > rect.bottom
  ) {
    return null;
  }

  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const x = Math.floor(((event.clientX - rect.left) * scaleX) / (canvas.width / history.present.width));
  const y = Math.floor(((event.clientY - rect.top) * scaleY) / (canvas.height / history.present.height));

  if (
    x < 0 ||
    y < 0 ||
    x >= history.present.width ||
    y >= history.present.height
  ) {
    return null;
  }

  return { x, y };
}

function getDragDirection(deltaX: number, deltaY: number, threshold: number): Direction | null {
  if (Math.abs(deltaX) < threshold && Math.abs(deltaY) < threshold) {
    return null;
  }

  if (Math.abs(deltaX) >= Math.abs(deltaY)) {
    return deltaX > 0 ? 'right' : 'left';
  }

  return deltaY > 0 ? 'down' : 'up';
}

canvas.addEventListener('pointerdown', (event) => {
  if (event.pointerType === 'mouse' && event.button !== 0) {
    return;
  }

  if (!getCanvasPoint(event)) {
    return;
  }

  dragState = {
    pointerId: event.pointerId,
    lastX: event.clientX,
    lastY: event.clientY,
  };
  canvas.setPointerCapture(event.pointerId);
  event.preventDefault();
});

canvas.addEventListener('pointermove', (event) => {
  if (!dragState || event.pointerId !== dragState.pointerId) {
    return;
  }

  const rect = canvas.getBoundingClientRect();
  const tileWidth = rect.width / history.present.width;
  const tileHeight = rect.height / history.present.height;
  const threshold = Math.min(tileWidth, tileHeight) * 0.35;
  const deltaX = event.clientX - dragState.lastX;
  const deltaY = event.clientY - dragState.lastY;
  const direction = getDragDirection(deltaX, deltaY, threshold);

  if (!direction) {
    return;
  }

  event.preventDefault();
  const didMove = commitHistory(applyHistoryMove(history, direction));

  dragState.lastX = event.clientX;
  dragState.lastY = event.clientY;

  if (!didMove) {
    return;
  }
});

function clearDrag(pointerId: number) {
  if (!dragState || dragState.pointerId !== pointerId) {
    return;
  }

  if (canvas.hasPointerCapture(pointerId)) {
    canvas.releasePointerCapture(pointerId);
  }

  dragState = null;
}

canvas.addEventListener('pointerup', (event) => {
  clearDrag(event.pointerId);
});

canvas.addEventListener('pointercancel', (event) => {
  clearDrag(event.pointerId);
});

undoButton.addEventListener('click', () => {
  runUndo();
});

redoButton.addEventListener('click', () => {
  runRedo();
});

restartButton.addEventListener('click', () => {
  runRestart();
});

shareButton.addEventListener('click', () => {
  void copyShareText();
});

animationToggle.addEventListener('click', () => {
  animationsEnabled = !animationsEnabled;

  if (!animationsEnabled) {
    stopAnimation();
  }

  draw();
});

statsButton.addEventListener('click', () => {
  updateStatsModal();
  setStatsModalVisible(true);
});

closeStatsButton.addEventListener('click', () => {
  setStatsModalVisible(false);
});

statsModal.addEventListener('click', (event) => {
  if (event.target === statsModal) {
    setStatsModalVisible(false);
  }
});

draw();
updateCountdown();
updateStatsModal();

countdownTimerId = window.setInterval(() => {
  if (countdownTimerId === null) {
    return;
  }

  updateCountdown();
}, 1000);
