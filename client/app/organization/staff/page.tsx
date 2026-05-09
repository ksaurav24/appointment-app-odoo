import { PersonsTable } from "@/components/organization/inventory/persons-table";

export default function StaffPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Staff
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage bookable staff, assignments, overrides, and availability
          exceptions.
        </p>
      </header>
      <PersonsTable />
    </div>
  );
}
