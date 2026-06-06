const TZ = 'Asia/Kolkata';

/** "5 Jun 2025" */
export function istDate(d: Date | string | number) {
  return new Date(d).toLocaleDateString('en-IN', { timeZone: TZ, day: 'numeric', month: 'short', year: 'numeric' });
}

/** "05:30 PM" */
export function istTime(d: Date | string | number) {
  return new Date(d).toLocaleTimeString('en-IN', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });
}

/** "5 Jun 2025, 05:30 PM" */
export function istDateTime(d: Date | string | number) {
  return new Date(d).toLocaleString('en-IN', {
    timeZone: TZ, day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

/** "5 Jun" */
export function istDateShort(d: Date | string | number) {
  return new Date(d).toLocaleDateString('en-IN', { timeZone: TZ, day: 'numeric', month: 'short' });
}

/** "JUN" (3-letter uppercase month abbreviation) */
export function istMonthAbbr(d: Date | string | number) {
  return new Date(d).toLocaleDateString('en-IN', { timeZone: TZ, month: 'short' }).toUpperCase();
}

/** numeric day of month in IST ("5") */
export function istDay(d: Date | string | number) {
  return new Date(d).toLocaleDateString('en-IN', { timeZone: TZ, day: 'numeric' });
}
