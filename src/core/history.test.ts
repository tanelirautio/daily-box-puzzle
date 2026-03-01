import { describe, expect, it } from 'vitest';
import {
  applyHistoryMove,
  createHistory,
  redoHistory,
  restartHistory,
  undoHistory,
} from './history';
import { parseLevel } from './parse';

function createSampleHistory() {
  return createHistory(parseLevel(`
    ######
    #....#
    #.@$.#
    #....#
    #...G#
    ######
  `));
}

describe('history controls', () => {
  it('does not record blocked moves', () => {
    const start = createSampleHistory();
    const blocked = applyHistoryMove(start, 'left');

    expect(blocked).toBe(start);
    expect(blocked.present.moveCount).toBe(0);
    expect(blocked.past).toHaveLength(0);
  });

  it('undo restores the previous snapshot and move count', () => {
    const start = createSampleHistory();
    const moved = applyHistoryMove(start, 'right');
    const undone = undoHistory(moved);

    expect(moved.present.player).toEqual({ x: 3, y: 2 });
    expect(undone.present.player).toEqual({ x: 2, y: 2 });
    expect(undone.present.crates.has('3,2')).toBe(true);
    expect(undone.present.moveCount).toBe(0);
    expect(undone.past).toHaveLength(0);
    expect(undone.future).toHaveLength(1);
  });

  it('redo reapplies the undone move and keeps move count', () => {
    const start = createSampleHistory();
    const moved = applyHistoryMove(start, 'right');
    const redone = redoHistory(undoHistory(moved));

    expect(redone.present.player).toEqual({ x: 3, y: 2 });
    expect(redone.present.crates.has('4,2')).toBe(true);
    expect(redone.present.moveCount).toBe(1);
    expect(redone.past).toHaveLength(1);
    expect(redone.future).toHaveLength(0);
  });

  it('clears redo after a new move', () => {
    const start = createSampleHistory();
    const moved = applyHistoryMove(start, 'right');
    const branch = applyHistoryMove(undoHistory(moved), 'down');

    expect(branch.present.player).toEqual({ x: 2, y: 3 });
    expect(branch.present.moveCount).toBe(1);
    expect(branch.future).toHaveLength(0);
  });

  it('uses immutable snapshots without shared references', () => {
    const start = createSampleHistory();
    const moved = applyHistoryMove(start, 'right');

    expect(moved.past[0]).not.toBe(start.present);
    expect(moved.present).not.toBe(start.present);
    expect(moved.past[0].crates).not.toBe(start.present.crates);
    expect(moved.present.crates).not.toBe(start.present.crates);
    expect(moved.past[0].walls).not.toBe(start.present.walls);
    expect(moved.present.goals).not.toBe(start.present.goals);
  });

  it('restart resets to the initial snapshot and clears history', () => {
    const start = createSampleHistory();
    const moved = applyHistoryMove(start, 'right');
    const restarted = restartHistory(moved);

    expect(restarted.present.player).toEqual(start.present.player);
    expect(restarted.present.crates).toEqual(start.present.crates);
    expect(restarted.present.moveCount).toBe(0);
    expect(restarted.past).toHaveLength(0);
    expect(restarted.future).toHaveLength(0);
  });
});
