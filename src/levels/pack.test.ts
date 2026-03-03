import { describe, expect, it } from 'vitest';
import { applyMove, type Direction } from '../core/move';
import { parseLevel, toKey, type GameState } from '../core/parse';
import { levelPack } from './pack';

const directions: Direction[] = ['up', 'down', 'left', 'right'];

function encodeState(state: GameState): string {
  const crates = [...state.crates].sort().join(';');

  return `${toKey(state.player)}|${crates}`;
}

function isSolvable(level: string): boolean {
  const start = parseLevel(level);
  const queue: GameState[] = [start];
  const seen = new Set<string>([encodeState(start)]);

  while (queue.length > 0) {
    const current = queue.shift()!;

    if (current.isWin) {
      return true;
    }

    for (const direction of directions) {
      const next = applyMove(current, direction);

      if (next === current) {
        continue;
      }

      const key = encodeState(next);

      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      queue.push(next);
    }
  }

  return false;
}

describe('level pack', () => {
  it('keeps 20 levels', () => {
    expect(levelPack).toHaveLength(20);
  });

  it('uses balanced crate and goal counts in every level', () => {
    for (const level of levelPack) {
      const state = parseLevel(level);

      expect(state.crates.size).toBeGreaterThan(0);
      expect(state.crates.size).toBe(state.goals.size);
    }
  });

  it('contains only solvable levels', () => {
    for (const level of levelPack) {
      expect(isSolvable(level)).toBe(true);
    }
  });
});
