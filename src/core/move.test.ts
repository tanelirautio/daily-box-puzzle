import { describe, expect, it } from 'vitest';
import { applyMove } from './move';
import { parseLevel, toKey } from './parse';

describe('applyMove', () => {
  it('cannot move into wall', () => {
    const state = parseLevel(`
      ######
      #@...#
      #....#
      #....#
      #...G#
      ######
    `);

    expect(applyMove(state, 'left')).toBe(state);
  });

  it('can move into floor', () => {
    const state = parseLevel(`
      ######
      #@...#
      #....#
      #....#
      #...G#
      ######
    `);

    const next = applyMove(state, 'right');

    expect(next.player).toEqual({ x: 2, y: 1 });
    expect(next.moveCount).toBe(1);
  });

  it('can push one crate', () => {
    const state = parseLevel(`
      ######
      #....#
      #.@$.#
      #....#
      #...G#
      ######
    `);

    const next = applyMove(state, 'right');

    expect(next.player).toEqual({ x: 3, y: 2 });
    expect(next.crates.has('4,2')).toBe(true);
    expect(next.crates.size).toBe(1);
  });

  it('cannot push crate into wall', () => {
    const state = parseLevel(`
      ######
      #....#
      #..@$#
      #....#
      #...G#
      ######
    `);

    expect(applyMove(state, 'right')).toBe(state);
  });

  it('cannot push two crates', () => {
    const state = parseLevel(`
      ######
      #....#
      #.@$$#
      #....#
      #...G#
      ######
    `);

    expect(applyMove(state, 'right')).toBe(state);
  });

  it('detects win when all goals are covered', () => {
    const state = parseLevel(`
      ######
      #....#
      #.@$G#
      #....#
      #....#
      ######
    `);

    const next = applyMove(state, 'right');

    expect(next.crates.has(toKey({ x: 4, y: 2 }))).toBe(true);
    expect(next.isWin).toBe(true);
  });
});
