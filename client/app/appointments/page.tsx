import type { Metadata } from "next";
import { AppointmentsBrowser } from "@/components/features/appointments/appointments-browser";

// Page-level metadata — works because this is a server component.
export const metadata: Metadata = {
  title: "Find Organisations — Appointment App",
  description:
    "Browse trusted organisations and book your appointment in seconds.",
};

// This page is a SERVER component — it only renders the layout wrapper.
// AppointmentsBrowser (client component) handles all search interactivity.
// WHY the split: metadata requires a server component, but the search
// input requires client-side state. Splitting gives us both.
export default function AppointmentsPage() {
  return <AppointmentsBrowser />;
}
