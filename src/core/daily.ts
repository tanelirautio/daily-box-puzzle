const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function pad(value: number): string {
  return value.toString().padStart(2, '0');
}

function isValidDateKey(value: string): boolean {
  if (!DATE_PATTERN.test(value)) {
    return false;
  }

  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(year, month - 1, day);

  return (
    parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day
  );
}

export function getDateOverride(search: string): string | null {
  const params = new URLSearchParams(search);
  const override = params.get('date');

  if (!override || !isValidDateKey(override)) {
    return null;
  }

  return override;
}

export function getDateKeyLocal(now = new Date()): string {
  const year = now.getFullYear();
  const month = pad(now.getMonth() + 1);
  const day = pad(now.getDate());

  return `${year}-${month}-${day}`;
}

export function getActiveDateKey(
  search: string,
  now = new Date(),
): string {
  return getDateOverride(search) ?? getDateKeyLocal(now);
}

export type DateSelection = {
  dateKey: string;
  invalidOverride: string | null;
};

export function getDateSelection(
  search: string,
  now = new Date(),
): DateSelection {
  const params = new URLSearchParams(search);
  const override = params.get('date');
  const validOverride = override ? getDateOverride(search) : null;

  return {
    dateKey: validOverride ?? getDateKeyLocal(now),
    invalidOverride: override && !validOverride ? override : null,
  };
}

export function hashDateKeyToIndex(
  key: string,
  packLength: number,
): number {
  if (packLength <= 0) {
    throw new Error('packLength must be greater than 0.');
  }

  let hash = 0x811c9dc5;

  for (let index = 0; index < key.length; index += 1) {
    hash ^= key.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0) % packLength;
}

export function getTimeUntilLocalMidnight(now = new Date()): string {
  const nextMidnight = new Date(now);
  nextMidnight.setHours(24, 0, 0, 0);

  let totalSeconds = Math.max(
    0,
    Math.floor((nextMidnight.getTime() - now.getTime()) / 1000),
  );

  const hours = Math.floor(totalSeconds / 3600);
  totalSeconds %= 3600;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}
