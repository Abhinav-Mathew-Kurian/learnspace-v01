import { istDate, istTime, istDateTime, istDateShort, istMonthAbbr, istDay } from '@/lib/ist';

// Fix a reference instant: 2024-06-05T12:00:00Z = 17:30 IST (UTC+5:30)
const REF_UTC = new Date('2024-06-05T12:00:00Z');

describe('istDate', () => {
  it('formats a Date as "D Mon YYYY" in IST', () => {
    const result = istDate(REF_UTC);
    // 2024-06-05T12:00Z → 2024-06-05T17:30+05:30 → "5 Jun 2024"
    expect(result).toMatch(/5/);
    expect(result).toMatch(/Jun/i);
    expect(result).toMatch(/2024/);
  });

  it('accepts a string ISO date', () => {
    expect(() => istDate('2024-06-05T12:00:00Z')).not.toThrow();
  });

  it('accepts a numeric timestamp', () => {
    expect(() => istDate(REF_UTC.getTime())).not.toThrow();
  });
});

describe('istTime', () => {
  it('returns two-digit hour:minute with AM/PM', () => {
    const result = istTime(REF_UTC);
    // 12:00 UTC → 17:30 IST
    expect(result).toMatch(/\d{2}:\d{2}/);
    expect(result).toMatch(/PM/i);
  });
});

describe('istDateTime', () => {
  it('contains date and time components', () => {
    const result = istDateTime(REF_UTC);
    expect(result).toMatch(/2024/);
    expect(result).toMatch(/Jun/i);
    expect(result).toMatch(/\d{2}:\d{2}/);
  });
});

describe('istDateShort', () => {
  it('returns day and abbreviated month without year', () => {
    const result = istDateShort(REF_UTC);
    expect(result).toMatch(/5/);
    expect(result).toMatch(/Jun/i);
    expect(result).not.toMatch(/2024/);
  });
});

describe('istMonthAbbr', () => {
  it('returns uppercase 3-letter month abbreviation', () => {
    const result = istMonthAbbr(REF_UTC);
    expect(result).toBe(result.toUpperCase());
    expect(result.length).toBeGreaterThanOrEqual(3);
    expect(result).toMatch(/JUN/i);
  });
});

describe('istDay', () => {
  it('returns the numeric day of month as string', () => {
    const result = istDay(REF_UTC);
    expect(result).toBe('5');
  });

  it('is consistent with istDate', () => {
    const day = istDay(REF_UTC);
    const date = istDate(REF_UTC);
    expect(date).toContain(day);
  });
});
