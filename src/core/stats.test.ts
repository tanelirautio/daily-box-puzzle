import { describe, expect, it } from 'vitest';
import {
  computeStreaks,
  ensureDailyAttempt,
  normalizeStatsStore,
  recordSolved,
} from './stats';

describe('computeStreaks', () => {
  it('counts the current and best solved streaks', () => {
    const stats = {
      days: {
        '2026-02-25': { solved: true, bestMoves: 9, attempts: 1 },
        '2026-02-26': { solved: true, bestMoves: 8, attempts: 1 },
        '2026-02-27': { solved: true, bestMoves: 7, attempts: 1 },
        '2026-03-01': { solved: true, bestMoves: 6, attempts: 1 },
      },
    };

    expect(computeStreaks(stats, '2026-03-01')).toEqual({
      current: 1,
      best: 3,
    });
  });

  it('extends the current streak across consecutive days', () => {
    const stats = {
      days: {
        '2026-02-27': { solved: true, bestMoves: 7, attempts: 1 },
        '2026-02-28': { solved: true, bestMoves: 6, attempts: 1 },
        '2026-03-01': { solved: true, bestMoves: 5, attempts: 1 },
      },
    };

    expect(computeStreaks(stats, '2026-03-01')).toEqual({
      current: 3,
      best: 3,
    });
  });
});

describe('stats storage schema', () => {
  it('normalizes invalid stored values into a safe schema', () => {
    expect(
      normalizeStatsStore({
        days: {
          '2026-03-01': {
            solved: true,
            bestMoves: 10,
            attempts: 2.7,
          },
          nope: {
            solved: true,
            bestMoves: 'bad',
            attempts: -4,
          },
          '2026-03-02': {
            solved: 'yes',
            bestMoves: Infinity,
            attempts: '3',
          },
        },
      }),
    ).toEqual({
      days: {
        '2026-03-01': {
          solved: true,
          bestMoves: 10,
          attempts: 2,
        },
        '2026-03-02': {
          solved: false,
          bestMoves: null,
          attempts: 0,
        },
      },
    });
  });

  it('keeps attempts and best moves in the expected shape', () => {
    const withAttempt = ensureDailyAttempt({ days: {} }, '2026-03-01');
    const solved = recordSolved(withAttempt, '2026-03-01', 14);

    expect(withAttempt.days['2026-03-01']).toEqual({
      solved: false,
      bestMoves: null,
      attempts: 1,
    });
    expect(solved.days['2026-03-01']).toEqual({
      solved: true,
      bestMoves: 14,
      attempts: 1,
    });
  });
});
