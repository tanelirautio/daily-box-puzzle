import type { GameState, Tile } from './parse.js';
import { toKey } from './parse.js';

export type Direction = 'up' | 'down' | 'left' | 'right';

const OFFSETS: Record<Direction, Tile> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

function add(a: Tile, b: Tile): Tile {
  return { x: a.x + b.x, y: a.y + b.y };
}

function isInBounds(state: GameState, tile: Tile): boolean {
  return (
    tile.x >= 0 &&
    tile.y >= 0 &&
    tile.x < state.width &&
    tile.y < state.height
  );
}

function hasWinCondition(goals: Set<string>, crates: Set<string>): boolean {
  for (const goal of goals) {
    if (!crates.has(goal)) {
      return false;
    }
  }

  return true;
}

export function applyMove(state: GameState, dir: Direction): GameState {
  const offset = OFFSETS[dir];
  const nextPlayer = add(state.player, offset);

  if (!isInBounds(state, nextPlayer)) {
    return state;
  }

  const nextPlayerKey = toKey(nextPlayer);

  if (state.walls.has(nextPlayerKey)) {
    return state;
  }

  if (!state.crates.has(nextPlayerKey)) {
    return {
      ...state,
      player: nextPlayer,
      moveCount: state.moveCount + 1,
      isWin: hasWinCondition(state.goals, state.crates),
    };
  }

  const nextCrate = add(nextPlayer, offset);

  if (!isInBounds(state, nextCrate)) {
    return state;
  }

  const nextCrateKey = toKey(nextCrate);

  if (state.walls.has(nextCrateKey) || state.crates.has(nextCrateKey)) {
    return state;
  }

  const crates = new Set(state.crates);
  crates.delete(nextPlayerKey);
  crates.add(nextCrateKey);

  return {
    ...state,
    crates,
    player: nextPlayer,
    moveCount: state.moveCount + 1,
    isWin: hasWinCondition(state.goals, crates),
  };
}
