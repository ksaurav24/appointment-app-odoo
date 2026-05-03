"use client";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

type GuestProps = {
  variant: "guest";
  message?: string;
};

type HostWaitingProps = {
  variant: "host-waiting";
  /** Customer-facing label for the waiting party. Falls back if unknown. */
  guestLabel?: string;
  message?: string;
};

type HostProps = {
  variant: "host";
  /** Customer-facing label for the waiting party. Falls back if unknown. */
  guestLabel?: string;
  onAdmit: () => void;
  onReject: () => void;
};

type Props = GuestProps | HostWaitingProps | HostProps;

export function WaitingBanner(props: Props) {
  if (props.variant === "guest") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-white/10 bg-black/50 px-6 py-5 text-center text-white">
        <Spinner className="size-5" />
        <p className="text-sm">
          {props.message ?? "Waiting for the host to admit you…"}
        </p>
      </div>
    );
  }

  if (props.variant === "host-waiting") {
    const label = props.guestLabel ?? "the customer";
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-white/10 bg-black/50 px-6 py-5 text-center text-white">
        <Spinner className="size-5" />
        <p className="text-sm font-medium">
          {props.message ?? `Waiting for ${label} to join…`}
        </p>
        <p className="text-xs text-white/60">
          You&apos;ll be able to admit them once they arrive.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-white/10 bg-black/70 px-6 py-5 text-white shadow-lg">
      <p className="text-sm">
        <span className="font-medium">{props.guestLabel ?? "Customer"}</span>
        {" "}is waiting to join.
      </p>
      <div className="flex gap-2">
        <Button type="button" size="sm" onClick={props.onAdmit}>
          Admit
        </Button>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={props.onReject}
        >
          Reject
        </Button>
      </div>
    </div>
  );
}
