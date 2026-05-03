// Formatters for booking UI: prices, durations, times, dates.
// All pure — safe to call from server components.
//
// Date/time formatting goes through moment-timezone so every surface
// (slot picker, review screen, confirmation, booking detail) renders the
// same wall-clock string in the configured zone, regardless of the
// browser's local timezone.

import moment from "moment-timezone";

export function formatPrice(decimalString: string | null, currency = "INR"): string {
  if (!decimalString) return "Free";
  const n = Number(decimalString);
  if (!Number.isFinite(n) || n <= 0) return "Free";
  if (currency === "INR") return `₹${n.toFixed(2)}`;
  return `${currency} ${n.toFixed(2)}`;
}

// Razorpay returns amounts in minor units (paise). Convert to display.
export function formatMinorUnits(amount: number, currency = "INR"): string {
  const major = amount / 100;
  if (currency === "INR") return `₹${major.toFixed(2)}`;
  return `${currency} ${major.toFixed(2)}`;
}

export function formatDuration(mins: number): string {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function formatDurationRange(
  min: number,
  max: number,
): string {
  if (min === max) return formatDuration(min);
  return `${min}–${max} min`;
}

// Falls back to UTC if `timeZone` is missing/unknown to moment-tz, so a
// stale payload never crashes formatting in production.
function inZone(iso: string, timeZone: string): moment.Moment {
  const zone = timeZone && moment.tz.zone(timeZone) ? timeZone : "UTC";
  return moment.tz(iso, zone);
}

export function formatTimeInZone(iso: string, timeZone: string): string {
  return inZone(iso, timeZone).format("h:mm A");
}

export function formatDateInZone(iso: string, timeZone: string): string {
  return inZone(iso, timeZone).format("ddd, MMM D, YYYY");
}

export function formatDateTimeInZone(iso: string, timeZone: string): string {
  return inZone(iso, timeZone).format("ddd, MMM D, YYYY [at] h:mm A");
}

// "Mon", "Tue", … from a 0..6 dayOfWeek (0=Sun).
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export function dayOfWeekName(day: number): string {
  return DAY_NAMES[day] ?? "";
}

// Format a HH:MM string (e.g. "09:00") to "9:00 AM".
export function formatHHMM(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  return moment({ hour: h, minute: m }).format("h:mm A");
}

// Compute the difference from now to an ISO timestamp, formatted as M:SS.
// Returns "0:00" when the timestamp is in the past.
export function formatRemaining(toIso: string, nowMs: number = Date.now()): string {
  const diffMs = new Date(toIso).getTime() - nowMs;
  const totalSecs = Math.max(0, Math.floor(diffMs / 1000));
  const m = Math.floor(totalSecs / 60);
  const s = totalSecs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
