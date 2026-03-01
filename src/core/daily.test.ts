import { describe, expect, it } from 'vitest';
import {
  getActiveDateKey,
  getDateOverride,
  getDateSelection,
  hashDateKeyToIndex,
} from './daily';

describe('hashDateKeyToIndex', () => {
  it('is stable for a fixed date key', () => {
    expect(hashDateKeyToIndex('2026-03-01', 20)).toBe(1);
    expect(hashDateKeyToIndex('2026-03-01', 20)).toBe(1);
  });

  it('returns an index inside the pack bounds', () => {
    const index = hashDateKeyToIndex('2026-12-31', 20);

    expect(index).toBeGreaterThanOrEqual(0);
    expect(index).toBeLessThan(20);
  });
});

describe('date overrides', () => {
  it('uses a valid query-string override', () => {
    expect(getDateOverride('?date=2026-03-01')).toBe('2026-03-01');
    expect(
      getActiveDateKey('?date=2026-03-01', new Date('2026-01-01T12:00:00')),
    ).toBe('2026-03-01');
  });

  it('ignores invalid override values', () => {
    expect(getDateOverride('?date=2026-02-30')).toBeNull();
    expect(getDateOverride('?date=not-a-date')).toBeNull();
    expect(
      getActiveDateKey('?date=2026-02-30', new Date('2026-01-01T12:00:00')),
    ).toBe('2026-01-01');
  });

  it('returns a fallback plus the invalid override value', () => {
    expect(
      getDateSelection('?date=2026-02-30', new Date('2026-01-01T12:00:00')),
    ).toEqual({
      dateKey: '2026-01-01',
      invalidOverride: '2026-02-30',
    });
  });
});
