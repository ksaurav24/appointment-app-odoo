import { AppointmentsTable } from "@/components/organization/appointments/appointments-table";
import { StatusFilterBar } from "@/components/organization/appointments/status-filter-bar";

export default function AppointmentsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Appointments
        </h1>
        <p className="text-sm text-muted-foreground">
          Approve, manage, and review every booking.
        </p>
      </header>
      <StatusFilterBar />
      <AppointmentsTable />
    </div>
  );
}
