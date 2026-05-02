// Build a Google Calendar template URL for an appointment.
// Pure function — no side effects.

type CalendarInput = {
  title: string;
  startIso: string;
  endIso: string;
  description?: string;
  location?: string;
};

function toGoogleDate(iso: string): string {
  // Google Calendar wants YYYYMMDDTHHmmssZ in UTC.
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    "Z"
  );
}

export function buildGoogleCalendarUrl(input: CalendarInput): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: input.title,
    dates: `${toGoogleDate(input.startIso)}/${toGoogleDate(input.endIso)}`,
  });
  if (input.description) params.set("details", input.description);
  if (input.location) params.set("location", input.location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
