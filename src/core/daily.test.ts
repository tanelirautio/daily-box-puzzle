import { describe, expect, it } from 'vitest';
import {
  getActiveDateKey,
  getDateOverride,
  getDateSelection,
  hashDateKeyToIndex,
} from './daily';

describe('hashDateKeyToIndex', () => {
  it('is stable for a fixed date key', () => {
    const index = hashDateKeyToIndex('2026-03-01', 20);

    expect(hashDateKeyToIndex('2026-03-01', 20)).toBe(index);
    expect(hashDateKeyToIndex('2026-03-01', 20)).toBe(index);
  });

  it('returns an index inside the pack bounds', () => {
    const index = hashDateKeyToIndex('2026-12-31', 20);

    expect(index).toBeGreaterThanOrEqual(0);
    expect(index).toBeLessThan(20);
  });

  it('advances by one for consecutive dates', () => {
    const first = hashDateKeyToIndex('2026-03-01', 20);

    expect(hashDateKeyToIndex('2026-03-02', 20)).toBe((first + 1) % 20);
    expect(hashDateKeyToIndex('2026-03-03', 20)).toBe((first + 2) % 20);
    expect(hashDateKeyToIndex('2026-03-04', 20)).toBe((first + 3) % 20);
  });

  it('does not repeat after three days for the old hash-collision case', () => {
    const first = hashDateKeyToIndex('2026-01-09', 20);

    expect(hashDateKeyToIndex('2026-01-12', 20)).toBe((first + 3) % 20);
  });

  it('rejects invalid date keys', () => {
    expect(() => hashDateKeyToIndex('2026-02-30', 20)).toThrow(
      'Invalid date key "2026-02-30".',
    );
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
