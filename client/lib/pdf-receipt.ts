import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatDateTimeInZone, formatDuration, formatPrice } from "./format";
import type { AppointmentWithRelations } from "@/types";

export function downloadReceipt(appointment: AppointmentWithRelations) {
  const doc = new jsPDF();
  const org = appointment.appointmentType.organization;
  const tz = org.timezone;

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text(org.name, 14, 20);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text("Receipt / Booking Confirmation", 14, 28);
  if (org.address) {
    doc.text(org.address, 14, 34);
  }

  // Booking Details section
  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.text("Booking Details", 14, 48);

  const startStr = formatDateTimeInZone(appointment.startTime, tz);
  const durStr = formatDuration(appointment.durationMins);
  
  const paymentLine = (() => {
    if (!appointment.appointmentType.advancePaymentEnabled) return "Free";
    if (appointment.paymentStatus === "PAID") return "Paid";
    if (appointment.paymentStatus === "PENDING") return "Payment Processing";
    if (appointment.paymentStatus === "FAILED") return "Payment Failed";
    if (appointment.paymentStatus === "REFUNDED") return "Refunded";
    return appointment.paymentStatus;
  })();

  const detailsBody = [
    ["Service", appointment.appointmentType.name],
    ["Confirmation Code", appointment.confirmationCode],
    ["Status", appointment.status],
    ["Date & Time", startStr],
    ["Duration", durStr],
    ["Capacity", `${appointment.capacityBooked} seat(s)`],
    ["Payment Status", paymentLine],
  ];

  if (appointment.appointmentType.advancePaymentEnabled) {
    detailsBody.push([
      "Amount Paid",
      formatPrice(appointment.appointmentType.advancePaymentAmount),
    ]);
  }

  const entityName =
    appointment.bookablePerson?.name ??
    appointment.bookableResource?.name ??
    null;

  if (entityName) {
    detailsBody.push([
      appointment.bookablePerson ? "Provider" : "Resource",
      entityName,
    ]);
  }

  autoTable(doc, {
    startY: 52,
    head: [],
    body: detailsBody,
    theme: "plain",
    styles: { fontSize: 10, cellPadding: 2 },
    columnStyles: {
      0: { fontStyle: "bold", textColor: [100, 100, 100], cellWidth: 50 },
      1: { cellWidth: 130 },
    },
  });

  // Footer
  const finalY = (doc as any).lastAutoTable.finalY || 100;
  doc.setFontSize(9);
  doc.setTextColor(150);
  doc.text(
    `Receipt generated on ${new Date().toLocaleDateString()}`,
    14,
    finalY + 15
  );

  doc.save(`Receipt_${appointment.confirmationCode}.pdf`);
}
