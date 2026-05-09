"use client";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useResourceUtilizationReport } from "@/hooks/useBookableResources";
import { ApiError } from "@/lib/api";

const TYPE_LABEL: Record<string, string> = {
  ROOM: "Room",
  EQUIPMENT: "Equipment",
  VENUE: "Venue",
  OTHER: "Other",
};

const INR = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

function asTypeLabel(value: string | null) {
  if (!value) return "—";
  return TYPE_LABEL[value] ?? value;
}

function asPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

export function ResourceUtilizationReport() {
  const report = useResourceUtilizationReport();

  const downloadPdf = () => {
    if (!report.data) return;
    const win = window.open("", "_blank", "noopener,noreferrer");
    if (!win) return;

    const rows = report.data.items
      .map(
        (item) => `
          <tr>
            <td>${item.name}</td>
            <td>${asTypeLabel(item.resourceType)}</td>
            <td>${asPercent(item.utilizationPercent.day)}</td>
            <td>${asPercent(item.utilizationPercent.week)}</td>
            <td>${asPercent(item.utilizationPercent.month)}</td>
            <td>${INR.format(item.revenue.total)}</td>
            <td>${item.isActive ? "Active" : "Inactive"}</td>
          </tr>
        `,
      )
      .join("");

    win.document.write(`
      <html>
        <head>
          <title>Resource Utilization Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
            h1 { margin: 0 0 8px; font-size: 20px; }
            p { margin: 0 0 16px; color: #555; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #d0d0d0; padding: 8px; text-align: left; }
            th { background: #f6f6f6; }
          </style>
        </head>
        <body>
          <h1>Resource Utilization Report</h1>
          <p>Generated at: ${new Date(report.data.generatedAt).toLocaleString()}</p>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Day Utilization</th>
                <th>Week Utilization</th>
                <th>Month Utilization</th>
                <th>Total Revenue</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-heading text-lg font-semibold">
            Resource utilization report
          </h2>
          <p className="text-sm text-muted-foreground">
            Utilization over rolling day, week, and month windows with revenue
            generated per resource.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={downloadPdf}
          disabled={!report.data || report.data.items.length === 0}
        >
          Download PDF
        </Button>
      </div>

      {report.isError ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {(report.error as ApiError | undefined)?.messages[0] ??
            "Failed to load utilization report"}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Day</TableHead>
              <TableHead>Week</TableHead>
              <TableHead>Month</TableHead>
              <TableHead>Day revenue</TableHead>
              <TableHead>Week revenue</TableHead>
              <TableHead>Month revenue</TableHead>
              <TableHead>Total revenue</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {report.isPending ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={9}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : report.data && report.data.items.length > 0 ? (
              report.data.items.map((item) => (
                <TableRow key={item.resourceId}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {asTypeLabel(item.resourceType)}
                  </TableCell>
                  <TableCell>{asPercent(item.utilizationPercent.day)}</TableCell>
                  <TableCell>{asPercent(item.utilizationPercent.week)}</TableCell>
                  <TableCell>{asPercent(item.utilizationPercent.month)}</TableCell>
                  <TableCell>{INR.format(item.revenue.day)}</TableCell>
                  <TableCell>{INR.format(item.revenue.week)}</TableCell>
                  <TableCell>{INR.format(item.revenue.month)}</TableCell>
                  <TableCell className="font-medium">
                    {INR.format(item.revenue.total)}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="py-8 text-center text-sm text-muted-foreground"
                >
                  No resource usage available yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
