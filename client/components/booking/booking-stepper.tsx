"use client";

import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

import { ArcTimePicker } from "@/components/booking/arc-time-picker";
import { AvailabilityCalendar } from "@/components/booking/availability-calendar";
import { EntityPicker } from "@/components/booking/entity-picker";
import { QuestionForm, validateAnswers } from "@/components/booking/question-form";
import { RazorpayCheckout } from "@/components/booking/razorpay-checkout";
import { SlotLockCountdown } from "@/components/booking/slot-lock-countdown";
import { StepIndicator } from "@/components/booking/step-indicator";
import { CheckoutShell } from "@/components/layout/checkout-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { useCurrentUser } from "@/hooks/useAuth";
import {
  useAcquireSlotLock,
  useCancelAppointment,
  useCreateAppointment,
  useCreatePaymentIntent,
  useExtendSlotLock,
  useReleaseSlotLock,
  useVerifyPayment,
} from "@/hooks/useBooking";
import { useAvailability } from "@/hooks/usePublicAppointments";
import {
  bookingReducer,
  INITIAL_STATE,
  activeSteps,
  nextStep,
  prevStep,
  stepNumber,
  type BookingStep,
} from "@/lib/booking-stepper-machine";
import {
  clearBookingDraft,
  loadBookingDraft,
  saveBookingDraft,
} from "@/lib/booking-draft";
import { releaseSlotLockBeacon } from "@/lib/api";
import {
  formatDateInZone,
  formatPrice,
  formatTimeInZone,
} from "@/lib/format";
import type {
  AppointmentTypeWithRelations,
  CreatePaymentIntentResult,
} from "@/types";

type BookingStepperProps = {
  type: AppointmentTypeWithRelations;
};

export function BookingStepper({ type }: BookingStepperProps) {
  const router = useRouter();
  const { data: user, isPending: userPending } = useCurrentUser();

  const steps = useMemo(() => activeSteps(type), [type]);
  const initialStep: BookingStep = steps[0];
  const [state, dispatch] = useReducer(bookingReducer, {
    ...INITIAL_STATE,
    step: initialStep,
  });

  const hydratedRef = useRef(false);
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    const draft = loadBookingDraft(type.id);
    if (draft && steps.includes(draft.step as BookingStep)) {
      dispatch({
        type: "HYDRATE",
        state: {
          step: draft.step as BookingStep,
          entityId: draft.entityId,
          date: draft.date,
          startTime: draft.startTime,
          endTime: draft.endTime,
          durationMinutes: draft.durationMinutes,
          capacityBooked: draft.capacityBooked,
          answers: draft.answers,
        },
      });
    }
  }, [type.id, steps]);

  useEffect(() => {
    if (state.appointmentPublicId) return;
    saveBookingDraft(type.id, {
      step: state.step,
      entityId: state.entityId,
      date: state.date,
      startTime: state.startTime,
      endTime: state.endTime,
      durationMinutes: state.durationMinutes,
      capacityBooked: state.capacityBooked,
      answers: state.answers,
    });
  }, [
    type.id,
    state.step,
    state.entityId,
    state.date,
    state.startTime,
    state.endTime,
    state.durationMinutes,
    state.capacityBooked,
    state.answers,
    state.appointmentPublicId,
  ]);

  useEffect(() => {
    const onUnload = () => {
      if (state.slotLockId) releaseSlotLockBeacon(state.slotLockId);
    };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [state.slotLockId]);

  const availabilityQuery = useAvailability(
    state.date ? type.id : undefined,
    {
      date: state.date,
      entityId: state.entityId,
      timezone: type.schedules[0]?.timezone,
    },
  );

  const acquire = useAcquireSlotLock();
  const extend = useExtendSlotLock();
  const release = useReleaseSlotLock();
  const createAppt = useCreateAppointment();
  const cancelAppt = useCancelAppointment();
  const createIntent = useCreatePaymentIntent();
  const verify = useVerifyPayment();

  const stepNum = stepNumber(state.step, type);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const goNext = () => {
    const next = nextStep(state.step, type);
    if (next) dispatch({ type: "GO_TO_STEP", step: next });
  };
  const goPrev = () => {
    const prev = prevStep(state.step, type);
    if (prev) dispatch({ type: "GO_TO_STEP", step: prev });
  };

  const onContinueFromQuestionsOrPrior = useCallback(() => {
    const next = nextStep(state.step, type);
    if (next === "review" && !user && !userPending) {
      const dest = encodeURIComponent(`/book/${type.id}`);
      router.push(`/login?next=${dest}`);
      return;
    }
    if (next) dispatch({ type: "GO_TO_STEP", step: next });
  }, [router, state.step, type, user, userPending]);

  const acquireRequestedRef = useRef(false);
  const acquireMutate = acquire.mutate;

  useEffect(() => {
    if (state.step !== "review") {
      acquireRequestedRef.current = false;
    }
  }, [state.step]);

  useEffect(() => {
    if (state.step !== "review") return;
    if (state.slotLockId) return;
    if (acquireRequestedRef.current) return;
    if (!state.startTime || !state.endTime) return;
    if (!user) return;

    acquireRequestedRef.current = true;
    acquireMutate(
      {
        appointmentTypeId: type.id,
        entityId:
          type.assignmentMode === "MANUAL" ? state.entityId : undefined,
        startTime: state.startTime,
        endTime: state.endTime,
      },
      {
        onSuccess: (lock) => {
          dispatch({
            type: "SET_SLOT_LOCK",
            slotLockId: lock.id,
            slotLockExpiresAt: lock.expiresAt,
          });
        },
        onError: (err) => {
          acquireRequestedRef.current = false;
          if (err.status === 409) {
            toast.error("This time was just taken. Pick another.");
            dispatch({ type: "GO_TO_STEP", step: "time" });
          } else {
            toast.error(err.messages[0] ?? "Couldn't hold this slot.");
          }
        },
      },
    );
  }, [
    state.step,
    state.slotLockId,
    state.startTime,
    state.endTime,
    state.entityId,
    type.id,
    type.assignmentMode,
    user,
    acquireMutate,
  ]);

  const handleExtend = useCallback(() => {
    if (!state.slotLockId) return;
    extend.mutate(state.slotLockId, {
      onSuccess: (lock) => {
        dispatch({
          type: "SET_SLOT_LOCK",
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
    dispatch({ type: "CLEAR_SLOT_LOCK" });
    dispatch({ type: "GO_TO_STEP", step: "time" });
  }, []);

  const releaseLockSync = useCallback(() => {
    if (state.slotLockId) {
      release.mutate(state.slotLockId);
      dispatch({ type: "CLEAR_SLOT_LOCK" });
    }
  }, [release, state.slotLockId]);

  const goBackFromReview = () => {
    releaseLockSync();
    goPrev();
  };

  const [paymentIntent, setPaymentIntent] =
    useState<CreatePaymentIntentResult | null>(null);
  const [paymentDismissed, setPaymentDismissed] = useState(false);

  const handleConfirm = () => {
    if (!state.slotLockId) {
      toast.error("Slot hold not active. Re-select a time.");
      dispatch({ type: "GO_TO_STEP", step: "time" });
      return;
    }
    const answersArr = type.bookingQuestions.map((q) => ({
      questionId: q.id,
      answerText: state.answers[q.id]?.trim() ? state.answers[q.id] : null,
    }));
    createAppt.mutate(
      {
        slotLockId: state.slotLockId,
        capacityBooked: state.capacityBooked,
        answers: answersArr.length > 0 ? answersArr : undefined,
      },
      {
        onSuccess: (appt) => {
          dispatch({ type: "SET_APPOINTMENT", appointmentPublicId: appt.publicId });
          clearBookingDraft(type.id);
          if (type.advancePaymentEnabled) {
            dispatch({ type: "GO_TO_STEP", step: "payment" });
          } else {
            router.push(
              `/book/${type.id}/confirmed?appointment=${encodeURIComponent(
                appt.publicId,
              )}`,
            );
          }
        },
        onError: (err) => {
          if (err.status === 404 || err.status === 409) {
            toast.error("Slot no longer available. Pick a new time.");
            dispatch({ type: "CLEAR_SLOT_LOCK" });
            dispatch({ type: "GO_TO_STEP", step: "time" });
          } else if (err.status === 400) {
            toast.error(err.messages[0] ?? "Some answers are invalid.");
            if (type.bookingQuestions.length > 0) {
              dispatch({ type: "GO_TO_STEP", step: "questions" });
            }
          } else {
            toast.error(err.messages[0] ?? "Couldn't confirm booking.");
          }
        },
      },
    );
  };

  const createIntentRequestedRef = useRef(false);
  const createIntentMutate = createIntent.mutate;

  useEffect(() => {
    if (state.step !== "payment") {
      createIntentRequestedRef.current = false;
    }
  }, [state.step]);

  useEffect(() => {
    if (state.step !== "payment") return;
    if (!state.appointmentPublicId) return;
    if (paymentIntent) return;
    if (createIntentRequestedRef.current) return;

    createIntentRequestedRef.current = true;
    createIntentMutate(
      { appointmentPublicId: state.appointmentPublicId },
      {
        onSuccess: (intent) => setPaymentIntent(intent),
        onError: (err) => {
          createIntentRequestedRef.current = false;
          toast.error(err.messages[0] ?? "Couldn't start payment.");
        },
      },
    );
  }, [
    state.step,
    state.appointmentPublicId,
    paymentIntent,
    createIntentMutate,
  ]);

  const handleVerified = (handle: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }) => {
    if (!state.appointmentPublicId) return;
    verify.mutate(handle, {
      onSuccess: () => {
        router.push(
          `/book/${type.id}/confirmed?appointment=${encodeURIComponent(
            state.appointmentPublicId!,
          )}`,
        );
      },
      onError: () => {
        toast.message(
          "Payment is being processed. We'll confirm shortly.",
        );
        router.push(
          `/book/${type.id}/confirmed?appointment=${encodeURIComponent(
            state.appointmentPublicId!,
          )}`,
        );
      },
    });
  };

  const handlePaymentDismissed = () => {
    setPaymentDismissed(true);
  };

  const handleCancelUnpaid = () => {
    if (!state.appointmentPublicId) return;
    cancelAppt.mutate(
      { publicId: state.appointmentPublicId, body: { reason: "Customer abandoned payment" } },
      {
        onSuccess: () => {
          toast.success("Booking cancelled.");
          router.push("/browse");
        },
        onError: (err) => {
          toast.error(err.messages[0] ?? "Couldn't cancel booking.");
        },
      },
    );
  };

  const continueDisabled = (() => {
    switch (state.step) {
      case "entity":
        return !state.entityId;
      case "time":
        return !state.date || !state.startTime || !state.endTime;
      case "questions": {
        const v = validateAnswers(type.bookingQuestions, state.answers);
        return !v.isValid;
      }
      default:
        return false;
    }
  })();

  const tz = type.schedules[0]?.timezone ?? type.organization.timezone;
  const confirmExit =
    state.step !== "entity" && !(state.step === "time" && !state.date);

  return (
    <CheckoutShell
      confirmExit={confirmExit}
      stepIndicator={<StepIndicator current={stepNum.current} total={stepNum.total} />}
    >
      <div className="mx-auto w-full max-w-2xl px-6 py-8">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          {type.name}
        </h1>
        <p className="text-sm text-muted-foreground">{type.organization.name}</p>

        <div className="mt-8 space-y-6">
          {state.step === "entity" ? (
            <section className="space-y-4">
              <h2 className="font-heading text-base font-semibold">
                Choose {type.entityType === "PERSON" ? "who" : "what"}
              </h2>
              <EntityPicker
                type={type}
                value={state.entityId}
                onChange={(id) => dispatch({ type: "SET_ENTITY", entityId: id })}
              />
            </section>
          ) : null}

          {state.step === "time" ? (
            <section className="space-y-4">
              <h2 className="font-heading text-base font-semibold">
                Pick a date and time
              </h2>
              <div className="grid gap-6 md:grid-cols-[auto_1fr]">
                <div>
                  <AvailabilityCalendar
                    schedules={type.schedules}
                    selected={state.date}
                    onSelect={(d) => dispatch({ type: "SET_DATE", date: d })}
                  />
                  <p className="mt-2 text-xs text-muted-foreground">
                    Times in {tz}.
                  </p>
                </div>
                <div>
                  <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
                    Available times
                  </p>
                  {!state.date ? (
                    <p className="rounded-md border border-dashed border-input bg-muted/30 px-3 py-6 text-center text-sm text-muted-foreground">
                      Select a date to see available times.
                    </p>
                  ) : availabilityQuery.isPending ? (
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
                </div>
              </div>
            </section>
          ) : null}

          {state.step === "questions" ? (
            <section className="space-y-4">
              <h2 className="font-heading text-base font-semibold">A few questions</h2>
              <QuestionForm
                questions={type.bookingQuestions}
                values={state.answers}
                onChange={(answers) =>
                  dispatch({ type: "SET_ANSWERS", answers })
                }
              />
            </section>
          ) : null}

          {state.step === "review" ? (
            <section className="space-y-4">
              <h2 className="font-heading text-base font-semibold">Review</h2>

              {state.slotLockExpiresAt ? (
                <SlotLockCountdown
                  expiresAt={state.slotLockExpiresAt}
                  onExtend={handleExtend}
                  onExpired={handleExpired}
                />
              ) : acquire.isPending ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Spinner className="size-4" /> Holding your slot…
                </div>
              ) : null}

              <Card>
                <CardContent className="space-y-3 p-4 text-sm">
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">
                      Service
                    </p>
                    <p>{type.name}</p>
                  </div>
                  {state.startTime && state.endTime ? (
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">
                        When
                      </p>
                      <p>
                        {formatDateInZone(state.startTime, tz)} ·{" "}
                        {formatTimeInZone(state.startTime, tz)}–
                        {formatTimeInZone(state.endTime, tz)} ({tz})
                      </p>
                    </div>
                  ) : null}
                  {type.maxBookingsPerSlot > 1 && type.manageCapacity ? (
                    <div className="space-y-1">
                      <Label htmlFor="capacity">Seats</Label>
                      <Input
                        id="capacity"
                        type="number"
                        min={1}
                        max={type.maxBookingsPerSlot}
                        value={state.capacityBooked}
                        onChange={(e) => {
                          const n = Math.max(
                            1,
                            Math.min(
                              type.maxBookingsPerSlot,
                              Number(e.target.value) || 1,
                            ),
                          );
                          dispatch({ type: "SET_CAPACITY", capacityBooked: n });
                        }}
                      />
                    </div>
                  ) : null}
                  {type.advancePaymentEnabled ? (
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">Price</p>
                      <p>{formatPrice(type.advancePaymentAmount)}</p>
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              <Button
                onClick={handleConfirm}
                disabled={
                  !state.slotLockId || createAppt.isPending || acquire.isPending
                }
              >
                {createAppt.isPending ? <Spinner className="mr-2 size-4" /> : null}
                {type.advancePaymentEnabled
                  ? "Continue to payment"
                  : "Confirm booking"}
              </Button>
            </section>
          ) : null}

          {state.step === "payment" ? (
            <section className="space-y-4">
              <h2 className="font-heading text-base font-semibold">Payment</h2>
              {paymentDismissed ? (
                <div className="space-y-3 rounded-md border border-amber-500/40 bg-amber-50 p-4 text-sm dark:bg-amber-950/30">
                  <p>Payment cancelled — your booking is held but unpaid.</p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => setPaymentDismissed(false)}
                    >
                      Retry payment
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleCancelUnpaid}
                      disabled={cancelAppt.isPending}
                    >
                      Cancel booking
                    </Button>
                  </div>
                </div>
              ) : !paymentIntent ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Spinner className="size-4" /> Preparing payment…
                </div>
              ) : !user ? (
                <p className="text-sm text-destructive">Session lost. Sign in again.</p>
              ) : (
                <RazorpayCheckout
                  intent={paymentIntent}
                  user={user}
                  onVerified={handleVerified}
                  onDismissed={handlePaymentDismissed}
                />
              )}
            </section>
          ) : null}
        </div>

        <div className="mt-10 flex items-center justify-between border-t pt-4">
          <Button
            variant="ghost"
            disabled={state.step === steps[0] || state.step === "payment"}
            onClick={state.step === "review" ? goBackFromReview : goPrev}
          >
            Back
          </Button>

          {state.step !== "review" && state.step !== "payment" ? (
            <Button
              disabled={continueDisabled}
              onClick={onContinueFromQuestionsOrPrior}
            >
              Continue
            </Button>
          ) : null}
        </div>
      </div>
    </CheckoutShell>
  );
}
