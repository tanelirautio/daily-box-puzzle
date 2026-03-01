import { applyMove, type Direction } from './move.js';
import { cloneState, type GameState } from './parse.js';

export type HistoryState = {
  initial: GameState;
  present: GameState;
  past: GameState[];
  future: GameState[];
};

export function createHistory(initial: GameState): HistoryState {
  const snapshot = cloneState(initial);

  return {
    initial: snapshot,
    present: cloneState(snapshot),
    past: [],
    future: [],
  };
}

export function applyHistoryMove(
  history: HistoryState,
  direction: Direction,
): HistoryState {
  const next = applyMove(history.present, direction);

  if (next === history.present) {
    return history;
  }

  return {
    ...history,
    present: cloneState(next),
    past: [...history.past, cloneState(history.present)],
    future: [],
  };
}

export function undoHistory(history: HistoryState): HistoryState {
  const previous = history.past[history.past.length - 1];

  if (!previous) {
    return history;
  }

  return {
    ...history,
    present: cloneState(previous),
    past: history.past.slice(0, -1),
    future: [cloneState(history.present), ...history.future],
  };
}

export function redoHistory(history: HistoryState): HistoryState {
  const [next, ...future] = history.future;

  if (!next) {
    return history;
  }

  return {
    ...history,
    present: cloneState(next),
    past: [...history.past, cloneState(history.present)],
    future,
  };
}

export function restartHistory(history: HistoryState): HistoryState {
  const reset = cloneState(history.initial);

  return {
    ...history,
    present: reset,
    past: [],
    future: [],
  };
}
