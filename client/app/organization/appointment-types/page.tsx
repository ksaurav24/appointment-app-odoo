import { TypesTable } from "@/components/organization/appointment-types/types-table";

export default function AppointmentTypesPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Appointment types
        </h1>
        <p className="text-sm text-muted-foreground">
          Configure the services customers can book.
        </p>
      </header>
      <TypesTable />
    </div>
  );
}
