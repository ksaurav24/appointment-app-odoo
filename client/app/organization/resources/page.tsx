import { ResourcesTable } from "@/components/organization/inventory/resources-table";
import { ResourceUtilizationReport } from "@/components/organization/inventory/resource-utilization-report";

export default function ResourcesPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Resources
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage rooms, equipment, venues, and utilization across your
          appointment operations.
        </p>
      </header>
      <ResourcesTable />
      <ResourceUtilizationReport />
    </div>
  );
}
