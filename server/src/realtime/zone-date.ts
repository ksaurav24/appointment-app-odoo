/**
 * Format a UTC instant as YYYY-MM-DD in the given IANA timezone. Mirrors the
 * `date` query param the booking page sends to /availability so emitted
 * `slot:updated` events land in the same room the page subscribed to.
 */
export function isoDateInZone(instant: Date, tz: string): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  // en-CA renders ISO-style "YYYY-MM-DD" — handy for avoiding string surgery.
  return fmt.format(instant);
}

/**
 * Returns every YYYY-MM-DD between `slotStart` and `slotEnd` (inclusive on
 * both ends) when interpreted in `tz`. A 23:30→00:30 slot in `tz` touches
 * two dates and the emitter must publish to both rooms so neither client
 * misses the update.
 */
export function isoDatesInZoneSpanned(
  slotStart: Date,
  slotEnd: Date,
  tz: string,
): string[] {
  const startDate = isoDateInZone(slotStart, tz);
  const endDate = isoDateInZone(
    // Subtract 1ms so a slot ending exactly at 00:00 of the next day doesn't
    // spuriously include that next day in the room set.
    new Date(slotEnd.getTime() - 1),
    tz,
  );
  if (startDate === endDate) return [startDate];
  return [startDate, endDate];
}
