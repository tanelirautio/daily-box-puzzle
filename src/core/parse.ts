export type Tile = {
  x: number;
  y: number;
};

export type GameState = {
  width: number;
  height: number;
  walls: Set<string>;
  goals: Set<string>;
  crates: Set<string>;
  player: Tile;
  moveCount: number;
  isWin: boolean;
};

const OPEN_TILES = new Set(['.', '@', '$', 'G']);

export function toKey(tile: Tile): string {
  return `${tile.x},${tile.y}`;
}

export function fromKey(key: string): Tile {
  const [x, y] = key.split(',').map(Number);
  return { x, y };
}

export function cloneState(state: GameState): GameState {
  return {
    width: state.width,
    height: state.height,
    walls: new Set(state.walls),
    goals: new Set(state.goals),
    crates: new Set(state.crates),
    player: { ...state.player },
    moveCount: state.moveCount,
    isWin: state.isWin,
  };
}

function hasWinCondition(goals: Set<string>, crates: Set<string>): boolean {
  for (const goal of goals) {
    if (!crates.has(goal)) {
      return false;
    }
  }

  return true;
}

export function parseLevel(source: string): GameState {
  const rows = source
    .trim()
    .split('\n')
    .map((row) => row.trim());
  const width = rows[0]?.length ?? 0;

  if (!width || rows.some((row) => row.length !== width)) {
    throw new Error('Level must contain rows of equal width.');
  }

  const walls = new Set<string>();
  const goals = new Set<string>();
  const crates = new Set<string>();
  let player: Tile | null = null;

  rows.forEach((row, y) => {
    [...row].forEach((cell, x) => {
      const tile = { x, y };
      const key = toKey(tile);

      if (cell === '#') {
        walls.add(key);
      } else if (cell === 'G') {
        goals.add(key);
      } else if (cell === '$') {
        crates.add(key);
      } else if (cell === '@') {
        if (player) {
          throw new Error('Level must contain exactly one player.');
        }

        player = tile;
      } else if (!OPEN_TILES.has(cell)) {
        throw new Error(`Unsupported tile "${cell}" at (${x}, ${y}).`);
      }
    });
  });

  if (!player) {
    throw new Error('Level must contain exactly one player.');
  }

  return {
    width,
    height: rows.length,
    walls,
    goals,
    crates,
    player,
    moveCount: 0,
    isWin: hasWinCondition(goals, crates),
  };
}
