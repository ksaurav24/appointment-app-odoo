"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useReducer, useState } from "react";
import { toast } from "sonner";

import { ArcTimePicker } from "@/components/booking/arc-time-picker";
import { AvailabilityCalendar } from "@/components/booking/availability-calendar";
import { SlotLockCountdown } from "@/components/booking/slot-lock-countdown";
import { CheckoutShell } from "@/components/layout/checkout-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  useAcquireSlotLock,
  useExtendSlotLock,
  useReleaseSlotLock,
  useRescheduleAppointment,
} from "@/hooks/useBooking";
import { useAvailability } from "@/hooks/usePublicAppointments";
import { releaseSlotLockBeacon } from "@/lib/api";
import {
  formatDateInZone,
  formatTimeInZone,
} from "@/lib/format";
import type { AppointmentWithRelations } from "@/types";

type Step = "date" | "time" | "review";

type State = {
  step: Step;
  date?: string;
  startTime?: string;
  endTime?: string;
  reason: string;
  slotLockId?: string;
  slotLockExpiresAt?: string;
};

type Action =
  | { type: "SET_STEP"; step: Step }
  | { type: "SET_DATE"; date: string }
  | { type: "SET_TIME"; startTime: string; endTime: string }
  | { type: "SET_REASON"; reason: string }
  | { type: "SET_LOCK"; slotLockId: string; slotLockExpiresAt: string }
  | { type: "CLEAR_LOCK" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_STEP":
      return { ...state, step: action.step };
    case "SET_DATE":
      return {
        ...state,
        date: action.date,
        startTime: undefined,
        endTime: undefined,
      };
    case "SET_TIME":
      return {
        ...state,
        startTime: action.startTime,
        endTime: action.endTime,
      };
    case "SET_REASON":
      return { ...state, reason: action.reason };
    case "SET_LOCK":
      return {
        ...state,
        slotLockId: action.slotLockId,
        slotLockExpiresAt: action.slotLockExpiresAt,
      };
    case "CLEAR_LOCK":
      return { ...state, slotLockId: undefined, slotLockExpiresAt: undefined };
    default:
      return state;
  }
}

type Props = { appointment: AppointmentWithRelations };

export function RescheduleStepper({ appointment }: Props) {
  const router = useRouter();
  const type = appointment.appointmentType;

  const [state, dispatch] = useReducer(reducer, {
    step: "date",
    reason: "",
  });

  // Best-effort lock release on tab close.
  useEffect(() => {
    const onUnload = () => {
      if (state.slotLockId) releaseSlotLockBeacon(state.slotLockId);
    };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [state.slotLockId]);

  const tz = appointment.appointmentType.organization.timezone;

  const availabilityQuery = useAvailability(state.date ? type.id : undefined, {
    date: state.date,
    entityId:
      appointment.bookablePersonId ??
      appointment.bookableResourceId ??
      undefined,
    timezone: tz,
  });

  const acquire = useAcquireSlotLock();
  const extend = useExtendSlotLock();
  const release = useReleaseSlotLock();
  const reschedule = useRescheduleAppointment();

  const [acquireRequested, setAcquireRequested] = useState(false);

  // Acquire fresh lock on entering Review.
  useEffect(() => {
    if (state.step !== "review") return;
    if (state.slotLockId) return;
    if (acquireRequested) return;
    if (!state.startTime || !state.endTime) return;

    setAcquireRequested(true);
    acquire.mutate(
      {
        appointmentTypeId: type.id,
        entityId:
          type.assignmentMode === "MANUAL"
            ? appointment.bookablePersonId ??
              appointment.bookableResourceId ??
              undefined
            : undefined,
        startTime: state.startTime,
        endTime: state.endTime,
      },
      {
        onSuccess: (lock) => {
          dispatch({
            type: "SET_LOCK",
            slotLockId: lock.id,
            slotLockExpiresAt: lock.expiresAt,
          });
        },
        onError: (err) => {
          if (err.status === 409) {
            toast.error("This time was just taken. Pick another.");
            dispatch({ type: "SET_STEP", step: "time" });
          } else {
            toast.error(err.messages[0] ?? "Couldn't hold this slot.");
          }
          setAcquireRequested(false);
        },
      },
    );
  }, [
    state.step,
    state.slotLockId,
    state.startTime,
    state.endTime,
    acquireRequested,
    type.id,
    type.assignmentMode,
    appointment.bookablePersonId,
    appointment.bookableResourceId,
    acquire,
  ]);

  const handleExtend = useCallback(() => {
    if (!state.slotLockId) return;
    extend.mutate(state.slotLockId, {
      onSuccess: (lock) => {
        dispatch({
          type: "SET_LOCK",
          slotLockId: lock.id,
          slotLockExpiresAt: lock.expiresAt,
        });
      },
      onError: () => {
        toast.warning("Couldn't extend your hold. Confirm soon.");
      },
    });
  }, [extend, state.slotLockId]);

  const handleExpired = useCallback(() => {
    toast.error("Your hold expired. Pick a new time.");
    dispatch({ type: "CLEAR_LOCK" });
    dispatch({ type: "SET_STEP", step: "time" });
    setAcquireRequested(false);
  }, []);

  const goBack = () => {
    if (state.step === "review" && state.slotLockId) {
      release.mutate(state.slotLockId);
      dispatch({ type: "CLEAR_LOCK" });
      setAcquireRequested(false);
    }
    if (state.step === "date") {
      router.push(`/bookings/${appointment.publicId}`);
      return;
    }
    if (state.step === "time") dispatch({ type: "SET_STEP", step: "date" });
    else if (state.step === "review")
      dispatch({ type: "SET_STEP", step: "time" });
  };

  const goNext = () => {
    if (state.step === "date") dispatch({ type: "SET_STEP", step: "time" });
    else if (state.step === "time")
      dispatch({ type: "SET_STEP", step: "review" });
  };

  const handleConfirm = () => {
    if (!state.slotLockId) {
      toast.error("Slot hold not active. Re-select a time.");
      dispatch({ type: "SET_STEP", step: "time" });
      return;
    }
    reschedule.mutate(
      {
        publicId: appointment.publicId,
        body: {
          slotLockId: state.slotLockId,
          reason: state.reason.trim() ? state.reason.trim() : undefined,
        },
      },
      {
        onSuccess: () => {
          toast.success("Appointment rescheduled.");
          router.push(`/bookings/${appointment.publicId}`);
        },
        onError: (err) => {
          if (err.status === 404 || err.status === 409) {
            toast.error("Slot no longer available. Pick a new time.");
            dispatch({ type: "CLEAR_LOCK" });
            dispatch({ type: "SET_STEP", step: "time" });
            setAcquireRequested(false);
          } else if (err.status === 400) {
            toast.error(err.messages[0] ?? "Reschedule not allowed.");
          } else {
            toast.error(err.messages[0] ?? "Couldn't reschedule.");
          }
        },
      },
    );
  };

  const continueDisabled = (() => {
    switch (state.step) {
      case "date":
        return !state.date;
      case "time":
        return !state.startTime || !state.endTime;
      default:
        return false;
    }
  })();

  return (
    <CheckoutShell
      confirmExit
      exitHref={`/bookings/${appointment.publicId}`}
    >
      <div className="mx-auto w-full max-w-2xl bg-card rounded-2xl border border-border shadow-sm px-6 py-8 sm:px-10 sm:py-10 my-4 sm:my-8">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Reschedule
        </h1>
        <p className="text-sm text-muted-foreground">
          {type.name} · currently {formatDateInZone(appointment.startTime, tz)}
        </p>

        <div className="mt-8 space-y-6">
          {state.step === "date" ? (
            <section className="space-y-4">
              <h2 className="font-heading text-base font-semibold">Pick a new date</h2>
              <AvailabilityCalendar
                schedules={[]}
                selected={state.date}
                onSelect={(d) => dispatch({ type: "SET_DATE", date: d })}
              />
              <p className="text-xs text-muted-foreground">
                Note: every date is selectable here; the time step will show only
                actually-bookable slots returned by the server.
              </p>
            </section>
          ) : null}

          {state.step === "time" ? (
            <section className="space-y-4">
              <h2 className="font-heading text-base font-semibold">Pick a new time</h2>
              {availabilityQuery.isPending ? (
                <Spinner className="size-4" />
              ) : availabilityQuery.isError || !availabilityQuery.data ? (
                <p className="text-sm text-destructive">
                  Couldn&apos;t load times. Try a different date.
                </p>
              ) : (
                <ArcTimePicker
                  availability={availabilityQuery.data}
                  selectedStart={state.startTime}
                  selectedEnd={state.endTime}
                  onChange={(s, e) =>
                    dispatch({ type: "SET_TIME", startTime: s, endTime: e })
                  }
                />
              )}
            </section>
          ) : null}

          {state.step === "review" ? (
            <section className="space-y-4">
              <h2 className="font-heading text-base font-semibold">Confirm reschedule</h2>

              {state.slotLockExpiresAt ? (
                <SlotLockCountdown
                  expiresAt={state.slotLockExpiresAt}
                  onExtend={handleExtend}
                  onExpired={handleExpired}
                />
              ) : acquire.isPending ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Spinner className="size-4" /> Holding your slot&hellip;
                </div>
              ) : null}

              <Card>
                <CardContent className="space-y-3 p-4 text-sm">
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">From</p>
                    <p>{formatDateInZone(appointment.startTime, tz)} ·{" "}
                       {formatTimeInZone(appointment.startTime, tz)}</p>
                  </div>
                  {state.startTime && state.endTime ? (
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">To</p>
                      <p>
                        {formatDateInZone(state.startTime, tz)} ·{" "}
                        {formatTimeInZone(state.startTime, tz)}–
                        {formatTimeInZone(state.endTime, tz)} ({tz})
                      </p>
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              <div className="space-y-2">
                <Label htmlFor="reschedule-reason">Reason (optional)</Label>
                <Textarea
                  id="reschedule-reason"
                  value={state.reason}
                  onChange={(e) =>
                    dispatch({ type: "SET_REASON", reason: e.target.value })
                  }
                  rows={3}
                  maxLength={500}
                  placeholder="Optional note for the organizer"
                />
              </div>

              <Button
                onClick={handleConfirm}
                disabled={
                  !state.slotLockId ||
                  reschedule.isPending ||
                  acquire.isPending
                }
              >
                {reschedule.isPending ? <Spinner className="mr-2 size-4" /> : null}
                Confirm reschedule
              </Button>
            </section>
          ) : null}
        </div>

        <div className="mt-10 flex items-center justify-between border-t pt-4">
          <Button variant="ghost" onClick={goBack}>
            {state.step === "date" ? "Cancel" : "Back"}
          </Button>
          {state.step !== "review" ? (
            <Button disabled={continueDisabled} onClick={goNext}>
              Continue
            </Button>
          ) : null}
        </div>
      </div>
    </CheckoutShell>
  );
}
