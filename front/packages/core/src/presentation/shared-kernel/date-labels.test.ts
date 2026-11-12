import { describe, expect, it } from 'vitest';
import { dayLabel } from './date-labels';

describe('dayLabel', () => {
  it('should write the day, the month in full and the year, without time', () => {
    expect(dayLabel(new Date('2026-11-03T09:00:00Z'))).toBe('3 novembre 2026');
  });

  it('should date in the time zone of Paris', () => {
    expect(dayLabel(new Date('2026-11-03T23:30:00Z'))).toBe('4 novembre 2026');
  });
});
