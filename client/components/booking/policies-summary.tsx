import type { AppointmentType } from "@/types";
import { XCircle, RefreshCw, CheckCircle, CreditCard } from "lucide-react";

type PoliciesSummaryProps = {
  type: AppointmentType;
};

export function PoliciesSummary({ type }: PoliciesSummaryProps) {
  const cancellationObj = (() => {
    if (!type.cancellationAllowed) return { text: "Cancellation not allowed.", allowed: false };
    if (type.cancellationWindowHours == null)
      return { text: "Cancellation allowed any time before the appointment.", allowed: true };
    return { text: `Cancellation allowed up to ${type.cancellationWindowHours} hour${type.cancellationWindowHours === 1 ? "" : "s"} before the appointment.`, allowed: true };
  })();

  const rescheduleObj = (() => {
    if (!type.rescheduleAllowed) return { text: "Rescheduling not allowed.", allowed: false };
    const window =
      type.rescheduleWindowHours == null
        ? "any time before the appointment"
        : `up to ${type.rescheduleWindowHours} hour${type.rescheduleWindowHours === 1 ? "" : "s"} before the appointment`;
    const max =
      type.maxReschedulesAllowed == null
        ? ""
        : ` (up to ${type.maxReschedulesAllowed} time${type.maxReschedulesAllowed === 1 ? "" : "s"})`;
    return { text: `Rescheduling allowed ${window}${max}.`, allowed: true };
  })();

  return (
    <ul className="space-y-4">
      <li className="flex items-start gap-3">
        <XCircle className={`w-5 h-5 mt-0.5 shrink-0 ${cancellationObj.allowed ? "text-forest" : "text-coral"}`} />
        <div>
          <p className="text-sm font-semibold text-foreground">Cancellation</p>
          <p className="text-sm text-muted-foreground">{cancellationObj.text}</p>
        </div>
      </li>

      <li className="flex items-start gap-3">
        <RefreshCw className={`w-5 h-5 mt-0.5 shrink-0 ${rescheduleObj.allowed ? "text-amber-deep" : "text-coral"}`} />
        <div>
          <p className="text-sm font-semibold text-foreground">Rescheduling</p>
          <p className="text-sm text-muted-foreground">{rescheduleObj.text}</p>
        </div>
      </li>

      {type.manualConfirmation ? (
        <li className="flex items-start gap-3">
          <CheckCircle className="w-5 h-5 mt-0.5 shrink-0 text-slate-mid" />
          <div>
            <p className="text-sm font-semibold text-foreground">Approval required</p>
            <p className="text-sm text-muted-foreground">Bookings require organizer confirmation before they&apos;re final.</p>
          </div>
        </li>
      ) : null}

      {type.advancePaymentEnabled ? (
        <li className="flex items-start gap-3">
          <CreditCard className="w-5 h-5 mt-0.5 shrink-0 text-emerald-600" />
          <div>
            <p className="text-sm font-semibold text-foreground">Payment policy</p>
            <p className="text-sm text-muted-foreground">Advance payment required to confirm booking.</p>
          </div>
        </li>
      ) : null}
    </ul>
  );
}
