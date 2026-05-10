import type { AppointmentWithRelations } from "@/types";

export function downloadIcs(appointment: AppointmentWithRelations) {
  const start = new Date(appointment.startTime);
  const end = new Date(appointment.endTime);
  const org = appointment.appointmentType.organization;

  // Format date to ICS format (YYYYMMDDTHHMMSSZ)
  const formatIcsDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  };

  const icsLines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Appointly//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${appointment.publicId}@appointly.com`,
    `DTSTAMP:${formatIcsDate(new Date())}`,
    `DTSTART:${formatIcsDate(start)}`,
    `DTEND:${formatIcsDate(end)}`,
    `SUMMARY:${appointment.appointmentType.name} at ${org.name}`,
    `DESCRIPTION:Confirmation Code: ${appointment.confirmationCode}\\n\\n${appointment.appointmentType.description || ""}`,
    `LOCATION:${org.address || ""}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  const icsString = icsLines.join("\r\n");
  const blob = new Blob([icsString], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `Booking_${appointment.confirmationCode}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
