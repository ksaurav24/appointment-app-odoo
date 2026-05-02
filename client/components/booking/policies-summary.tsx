import type { AppointmentType } from "@/types";

type PoliciesSummaryProps = {
  type: AppointmentType;
};

export function PoliciesSummary({ type }: PoliciesSummaryProps) {
  const cancellation = (() => {
    if (!type.cancellationAllowed) return "Cancellation not allowed.";
    if (type.cancellationWindowHours == null)
      return "Cancellation allowed any time before the appointment.";
    return `Cancellation allowed up to ${type.cancellationWindowHours} hour${type.cancellationWindowHours === 1 ? "" : "s"} before the appointment.`;
  })();

  const reschedule = (() => {
    if (!type.rescheduleAllowed) return "Rescheduling not allowed.";
    const window =
      type.rescheduleWindowHours == null
        ? "any time before the appointment"
        : `up to ${type.rescheduleWindowHours} hour${type.rescheduleWindowHours === 1 ? "" : "s"} before the appointment`;
    const max =
      type.maxReschedulesAllowed == null
        ? ""
        : ` (up to ${type.maxReschedulesAllowed} time${type.maxReschedulesAllowed === 1 ? "" : "s"})`;
    return `Rescheduling allowed ${window}${max}.`;
  })();

  return (
    <ul className="space-y-1 text-sm text-muted-foreground">
      <li>{cancellation}</li>
      <li>{reschedule}</li>
      {type.manualConfirmation ? (
        <li>Bookings require organizer confirmation before they&apos;re final.</li>
      ) : null}
      {type.advancePaymentEnabled ? <li>Advance payment required.</li> : null}
    </ul>
  );
}
