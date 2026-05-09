"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useOrgAppointments } from "@/hooks/useOrgAppointments";
import { useOrgTimeseries, useOrgStaffPerformance } from "@/hooks/useOrgAnalytics";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function ExportButtons() {
  const { data: appointments } = useOrgAppointments();
  const { data: staffPerformance } = useOrgStaffPerformance();

  const handleExportCSV = () => {
    if (!appointments || appointments.length === 0) {
      toast.error("No appointments to export");
      return;
    }
    
    const headers = [
      "ID",
      "Customer ID",
      "Type",
      "Start Time",
      "End Time",
      "Status",
      "Payment Status",
      "Assignee"
    ];

    const rows = appointments.map((app) => [
      app.publicId,
      app.customerId,
      app.appointmentType.name,
      new Date(app.startTime).toLocaleString(),
      new Date(app.endTime).toLocaleString(),
      app.status,
      app.paymentStatus,
      app.bookablePerson?.name || app.bookableResource?.name || "Unassigned"
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `appointments_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportRevenuePDF = () => {
    if (!appointments) return;
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text("Revenue Report", 14, 22);
    
    doc.setFontSize(11);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);

    const paidAppointments = appointments.filter(a => a.paymentStatus === "PAID");
    const totalRevenue = paidAppointments.reduce((sum, app) => sum + (Number(app.totalAmount) || 0), 0);

    doc.text(`Total Paid Appointments: ${paidAppointments.length}`, 14, 40);
    doc.text(`Total Revenue: INR ${totalRevenue.toFixed(2)}`, 14, 48);

    autoTable(doc, {
      startY: 55,
      head: [["Date", "Customer ID", "Type", "Status", "Amount"]],
      body: paidAppointments.map(app => [
        new Date(app.startTime).toLocaleDateString(),
        app.customerId.slice(-8),
        app.appointmentType.name,
        app.status,
        (Number(app.totalAmount) || 0).toFixed(2)
      ])
    });

    doc.save(`revenue_report_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const handleExportStaffPDF = () => {
    if (!staffPerformance) return;
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text("Staff Performance Report", 14, 22);
    
    doc.setFontSize(11);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);

    autoTable(doc, {
      startY: 40,
      head: [["Staff Name", "Total Bookings", "Cancellations", "Revenue Generated"]],
      body: staffPerformance.map(staff => [
        staff.name,
        staff.bookings,
        staff.cancellations,
        `${staff.revenue.toFixed(2)}`
      ])
    });

    doc.save(`staff_performance_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <div className="flex flex-wrap gap-3">
      <Button variant="outline" onClick={handleExportCSV}>
        <Download className="mr-2 h-4 w-4" /> Export Appointments (CSV)
      </Button>
      <Button variant="outline" onClick={handleExportRevenuePDF}>
        <Download className="mr-2 h-4 w-4" /> Revenue Report (PDF)
      </Button>
      <Button variant="outline" onClick={handleExportStaffPDF}>
        <Download className="mr-2 h-4 w-4" /> Staff Performance (PDF)
      </Button>
    </div>
  );
}
