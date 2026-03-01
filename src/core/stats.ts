export type DailyRecord = {
  solved: boolean;
  bestMoves: number | null;
  attempts: number;
};

export type StatsStore = {
  days: Record<string, DailyRecord>;
};

export type StreakSummary = {
  current: number;
  best: number;
};

export type StatsSummary = {
  totalSolved: number;
  currentStreak: number;
  bestStreak: number;
};

const STORAGE_KEY = 'daily-box-puzzle:stats';
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isRecordLike(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function previousDateKey(key: string): string {
  const [year, month, day] = key.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() - 1);

  return date.toISOString().slice(0, 10);
}

function createDefaultRecord(): DailyRecord {
  return {
    solved: false,
    bestMoves: null,
    attempts: 0,
  };
}

export function normalizeStatsStore(value: unknown): StatsStore {
  if (!isRecordLike(value) || !isRecordLike(value.days)) {
    return { days: {} };
  }

  const days: Record<string, DailyRecord> = {};

  for (const [key, entry] of Object.entries(value.days)) {
    if (!DATE_PATTERN.test(key) || !isRecordLike(entry)) {
      continue;
    }

    const solved = entry.solved === true;
    const bestMoves =
      typeof entry.bestMoves === 'number' && Number.isFinite(entry.bestMoves)
        ? entry.bestMoves
        : null;
    const attempts =
      typeof entry.attempts === 'number' && Number.isFinite(entry.attempts)
        ? Math.max(0, Math.floor(entry.attempts))
        : 0;

    days[key] = {
      solved,
      bestMoves,
      attempts,
    };
  }

  return { days };
}

export function loadStats(storage: Storage | null): StatsStore {
  if (!storage) {
    return { days: {} };
  }

  try {
    const raw = storage.getItem(STORAGE_KEY);

    if (!raw) {
      return { days: {} };
    }

    return normalizeStatsStore(JSON.parse(raw));
  } catch {
    return { days: {} };
  }
}

export function saveStats(storage: Storage | null, stats: StatsStore): void {
  if (!storage) {
    return;
  }

  storage.setItem(STORAGE_KEY, JSON.stringify(stats));
}

export function ensureDailyAttempt(stats: StatsStore, dateKey: string): StatsStore {
  const current = stats.days[dateKey] ?? createDefaultRecord();
  const nextAttempts = current.attempts > 0 ? current.attempts : 1;

  if (current.attempts === nextAttempts) {
    return stats;
  }

  return {
    days: {
      ...stats.days,
      [dateKey]: {
        ...current,
        attempts: nextAttempts,
      },
    },
  };
}

export function incrementAttempts(stats: StatsStore, dateKey: string): StatsStore {
  const current = stats.days[dateKey] ?? createDefaultRecord();

  return {
    days: {
      ...stats.days,
      [dateKey]: {
        ...current,
        attempts: current.attempts + 1,
      },
    },
  };
}

export function recordSolved(
  stats: StatsStore,
  dateKey: string,
  moveCount: number,
): StatsStore {
  const current = stats.days[dateKey] ?? createDefaultRecord();
  const bestMoves =
    current.bestMoves === null
      ? moveCount
      : Math.min(current.bestMoves, moveCount);

  return {
    days: {
      ...stats.days,
      [dateKey]: {
        solved: true,
        bestMoves,
        attempts: Math.max(1, current.attempts),
      },
    },
  };
}

export function getDailyRecord(
  stats: StatsStore,
  dateKey: string,
): DailyRecord {
  return stats.days[dateKey] ?? createDefaultRecord();
}

export function computeStreaks(
  stats: StatsStore,
  todayKey: string,
): StreakSummary {
  const solvedKeys = Object.keys(stats.days)
    .filter((key) => stats.days[key]?.solved)
    .sort();

  let best = 0;
  let run = 0;
  let previous: string | null = null;

  for (const key of solvedKeys) {
    if (previous && previousDateKey(key) === previous) {
      run += 1;
    } else {
      run = 1;
    }

    best = Math.max(best, run);
    previous = key;
  }

  let current = 0;
  let cursor = todayKey;

  while (stats.days[cursor]?.solved) {
    current += 1;
    cursor = previousDateKey(cursor);
  }

  return {
    current,
    best,
  };
}

export function summarizeStats(
  stats: StatsStore,
  todayKey: string,
): StatsSummary {
  const totalSolved = Object.values(stats.days).filter((day) => day.solved).length;
  const streaks = computeStreaks(stats, todayKey);

  return {
    totalSolved,
    currentStreak: streaks.current,
    bestStreak: streaks.best,
  };
}

export function buildShareText(input: {
  dateKey: string;
  puzzleNumber: number;
  moves: number;
  bestMoves: number | null;
  level: string;
}): string {
  const bestLabel = input.bestMoves ?? input.moves;
  const emojiGrid = input.level
    .trim()
    .split('\n')
    .map((row) =>
      row
        .trim()
        .split('')
        .map((cell) => {
          if (cell === '#') {
            return '⬛';
          }

          if (cell === 'G') {
            return '🟩';
          }

          if (cell === '$') {
            return '🟫';
          }

          if (cell === '@') {
            return '🟨';
          }

          return '⬜';
        })
        .join(''),
    )
    .join('\n');

  return [
    `Daily Box Puzzle #${input.puzzleNumber} (${input.dateKey})`,
    `Moves: ${input.moves} | Best: ${bestLabel}`,
    emojiGrid,
  ].join('\n');
}

