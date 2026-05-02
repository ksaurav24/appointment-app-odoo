// Typed sessionStorage helpers for the booking-flow draft.
// Used to survive the login redirect mid-flow.

const KEY_PREFIX = "booking-draft:";

export type BookingDraft = {
  step: string;
  entityId?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  durationMinutes?: number;
  capacityBooked: number;
  answers: Record<string, string>;
  // Lock state is intentionally NOT persisted — locks are server-side
  // and only valid for 5 minutes. We re-acquire on resume.
  savedAt: number;
};

const MAX_DRAFT_AGE_MS = 30 * 60 * 1000; // 30 minutes

function key(appointmentTypeId: string): string {
  return `${KEY_PREFIX}${appointmentTypeId}`;
}

export function saveBookingDraft(
  appointmentTypeId: string,
  draft: Omit<BookingDraft, "savedAt">,
): void {
  if (typeof window === "undefined") return;
  const payload: BookingDraft = { ...draft, savedAt: Date.now() };
  try {
    window.sessionStorage.setItem(key(appointmentTypeId), JSON.stringify(payload));
  } catch {
    // Quota or disabled storage — silently ignore.
  }
}

export function loadBookingDraft(appointmentTypeId: string): BookingDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(key(appointmentTypeId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BookingDraft;
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof parsed.step !== "string" ||
      typeof parsed.savedAt !== "number" ||
      typeof parsed.capacityBooked !== "number" ||
      typeof parsed.answers !== "object"
    ) {
      clearBookingDraft(appointmentTypeId);
      return null;
    }
    if (Date.now() - parsed.savedAt > MAX_DRAFT_AGE_MS) {
      clearBookingDraft(appointmentTypeId);
      return null;
    }
    return parsed;
  } catch {
    clearBookingDraft(appointmentTypeId);
    return null;
  }
}

export function clearBookingDraft(appointmentTypeId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(key(appointmentTypeId));
  } catch {
    // ignore
  }
}
