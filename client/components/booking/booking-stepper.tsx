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
  useAppointment,
  useCancelAppointment,
  useCreateAppointment,
  useCreatePaymentIntent,
  useExtendSlotLock,
  useReleaseSlotLock,
  useSubmitAppointmentRequest,
  useVerifyPayment,
} from "@/hooks/useBooking";
import { useAvailability } from "@/hooks/usePublicAppointments";
import { useAvailabilityRealtime } from "@/hooks/useAvailabilityRealtime";
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

  // Tracks the rare case where the user has already moved past the
  // time-picker and a `slot:updated` arrives announcing the slot they had
  // selected just filled. We store the *slot key* of the affected slot
  // rather than a boolean; `selectedSlotFilled` is then derived, which
  // means a new selection (different `state.startTime`) auto-resets it
  // without needing a setState-in-effect.
  const [filledSlotKey, setFilledSlotKey] = useState<string | null>(null);
  const currentSlotKey =
    state.startTime && state.endTime
      ? `${state.startTime}|${state.endTime}`
      : null;
  const selectedSlotFilled =
    filledSlotKey !== null && filledSlotKey === currentSlotKey;

  useAvailabilityRealtime(
    {
      appointmentTypeId: type.id,
      date: state.date || undefined,
      entityId: state.entityId,
    },
    (payload) => {
      if (
        state.startTime &&
        state.endTime &&
        payload.slotStart === state.startTime &&
        payload.slotEnd === state.endTime &&
        payload.state === "booked"
      ) {
        setFilledSlotKey(`${payload.slotStart}|${payload.slotEnd}`);
      }
    },
  );

  // Manual-approval types skip slot_locks entirely so multiple customers can
  // submit competing PENDING requests for the same slot. The slot-lock hooks
  // are still mounted unconditionally (React rules) but the effects that call
  // them no-op for these types — see the `useEffect` below.
  const isApprovalFlow = type.manualConfirmation;

  const acquire = useAcquireSlotLock();
  const extend = useExtendSlotLock();
  const release = useReleaseSlotLock();
  const createAppt = useCreateAppointment();
  const submitRequest = useSubmitAppointmentRequest(type.id);
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
    if (isApprovalFlow) return;
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
    isApprovalFlow,
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
    if (!isApprovalFlow) releaseLockSync();
    goPrev();
  };

  const [paymentIntent, setPaymentIntent] =
    useState<CreatePaymentIntentResult | null>(null);
  const [paymentDismissed, setPaymentDismissed] = useState(false);
  const paymentResolvedRef = useRef(false);

  const paymentAppointment = useAppointment(state.appointmentPublicId, {
    enabled: state.step === "payment" && !!state.appointmentPublicId,
    refetchInterval: state.step === "payment" ? 3000 : undefined,
  });

  const handleConfirm = () => {
    const answersArr = type.bookingQuestions.map((q) => ({
      questionId: q.id,
      answerText: state.answers[q.id]?.trim() ? state.answers[q.id] : null,
    }));

    if (isApprovalFlow) {
      if (!state.startTime || !state.endTime) {
        toast.error("Pick a time before submitting.");
        dispatch({ type: "GO_TO_STEP", step: "time" });
        return;
      }
      submitRequest.mutate(
        {
          entityId:
            type.assignmentMode === "MANUAL" ? state.entityId : undefined,
          startTime: state.startTime,
          endTime: state.endTime,
          capacityBooked: state.capacityBooked,
          answers: answersArr.length > 0 ? answersArr : undefined,
        },
        {
          onSuccess: (appt) => {
            dispatch({ type: "SET_APPOINTMENT", appointmentPublicId: appt.publicId });
            clearBookingDraft(type.id);
            router.push(
              `/book/${type.id}/confirmed?appointment=${encodeURIComponent(
                appt.publicId,
              )}`,
            );
          },
          onError: (err) => {
            if (err.status === 409) {
              toast.error("Slot was just filled by approved bookings. Pick another time.");
              dispatch({ type: "GO_TO_STEP", step: "time" });
            } else if (err.status === 400) {
              toast.error(err.messages[0] ?? "Couldn't submit request.");
              if (type.bookingQuestions.length > 0) {
                dispatch({ type: "GO_TO_STEP", step: "questions" });
              }
            } else {
              toast.error(err.messages[0] ?? "Couldn't submit request.");
            }
          },
        },
      );
      return;
    }

    if (!state.slotLockId) {
      toast.error("Slot hold not active. Re-select a time.");
      dispatch({ type: "GO_TO_STEP", step: "time" });
      return;
    }
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
      paymentResolvedRef.current = false;
    }
  }, [state.step]);

  useEffect(() => {
    if (state.step !== "payment") return;
    if (!state.appointmentPublicId) return;
    if (!paymentAppointment.data) return;
    if (paymentResolvedRef.current) return;

    const appt = paymentAppointment.data;
    if (appt.paymentStatus === "PAID") {
      paymentResolvedRef.current = true;
      router.push(
        `/book/${type.id}/confirmed?appointment=${encodeURIComponent(
          state.appointmentPublicId,
        )}`,
      );
      return;
    }

    if (appt.paymentStatus === "FAILED" || appt.status === "CANCELLED") {
      paymentResolvedRef.current = true;
      toast.error("Payment failed or booking was cancelled. Please retry.");
      router.push("/browse");
    }
  }, [
    paymentAppointment.data,
    router,
    state.appointmentPublicId,
    state.step,
    type.id,
  ]);

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
      stepIndicator={
        <StepIndicator
          current={stepNum.current}
          total={stepNum.total}
          labels={steps.map((s) =>
            s === "entity" ? (type.entityType === "PERSON" ? "Staff" : "Resource")
            : s === "time" ? "Date & Time"
            : s === "questions" ? "Details"
            : s === "review" ? "Review"
            : s === "payment" ? "Payment"
            : s
          )}
        />
      }
    >
      <div className="mx-auto w-full max-w-2xl bg-card rounded-2xl border border-border shadow-sm px-6 py-8 sm:px-10 sm:py-10 my-4 sm:my-8">
        <div className="mb-8 border-b border-border pb-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-forest">{type.organization.name}</p>
          <h1 className="mt-1 font-heading text-2xl font-semibold tracking-tight text-foreground">
            {type.name}
          </h1>
        </div>

        {selectedSlotFilled &&
        state.step !== "entity" &&
        state.step !== "time" ? (
          <div
            role="alert"
            className="mt-6 flex flex-col gap-3 rounded-md border border-amber-500/40 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-100 sm:flex-row sm:items-center sm:justify-between"
          >
            <p>This time was just filled. Please pick another.</p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (!isApprovalFlow && state.slotLockId) releaseLockSync();
                dispatch({ type: "GO_TO_STEP", step: "time" });
              }}
            >
              Pick another time
            </Button>
          </div>
        ) : null}

        <div className="mt-8 space-y-6">
          {state.step === "entity" ? (
            <section className="space-y-5">
              <div className="space-y-1">
                <h2 className="font-heading text-lg font-semibold">
                  Choose {type.entityType === "PERSON" ? "your staff member" : "a resource"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Select who or what you&apos;d like to book.
                </p>
              </div>
              <EntityPicker
                type={type}
                value={state.entityId}
                onChange={(id) => dispatch({ type: "SET_ENTITY", entityId: id })}
              />
            </section>
          ) : null}

          {state.step === "time" ? (
            <section className="space-y-5">
              <div className="space-y-1">
                <h2 className="font-heading text-lg font-semibold">Pick a date &amp; time</h2>
                <p className="text-sm text-muted-foreground">
                  Select an available slot. Times are shown in <span className="font-medium text-foreground">{tz}</span>.
                </p>
              </div>
              <div className="grid gap-6 md:grid-cols-[auto_1fr]">
                <div>
                  <AvailabilityCalendar
                    schedules={type.schedules}
                    selected={state.date}
                    onSelect={(d) => dispatch({ type: "SET_DATE", date: d })}
                  />
                </div>
                <div>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Available times
                  </p>
                  {!state.date ? (
                    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 py-12 text-center">
                      <span className="text-3xl">📅</span>
                      <p className="mt-2 text-sm text-muted-foreground">Select a date to see available times.</p>
                    </div>
                  ) : availabilityQuery.isPending ? (
                    <div className="flex h-40 items-center justify-center">
                      <Spinner className="size-5" />
                    </div>
                  ) : availabilityQuery.isError || !availabilityQuery.data ? (
                    <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
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
            <section className="space-y-5">
              <div className="space-y-1">
                <h2 className="font-heading text-lg font-semibold">A few quick questions</h2>
                <p className="text-sm text-muted-foreground">Your answers help the organizer prepare for your appointment.</p>
              </div>
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
            <section className="space-y-5">
              <div className="space-y-1">
                <h2 className="font-heading text-lg font-semibold">
                  {isApprovalFlow ? "Review your request" : "Confirm your booking"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {isApprovalFlow ? "Your request will be reviewed by the organizer." : "Check the details below and confirm."}
                </p>
              </div>

              {isApprovalFlow ? (
                <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  <span className="mt-0.5 text-lg">ℹ️</span>
                  <p>This service requires organiser approval. Other customers
                  may also request the same time — the organiser will choose
                  who to confirm.</p>
                </div>
              ) : state.slotLockExpiresAt ? (
                <SlotLockCountdown
                  expiresAt={state.slotLockExpiresAt}
                  onExtend={handleExtend}
                  onExpired={handleExpired}
                />
              ) : acquire.isPending ? (
                <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                  <Spinner className="size-4" /> Securing your slot…
                </div>
              ) : null}

              <div className="overflow-hidden rounded-xl border border-border shadow-sm">
                <div className="bg-forest px-5 py-4">
                  <p className="font-heading text-base font-semibold text-white">{type.name}</p>
                  <p className="text-xs text-white/70">{type.organization.name}</p>
                </div>
                <div className="divide-y divide-border bg-card px-5">
                  {state.startTime && state.endTime ? (
                    <div className="flex items-center justify-between py-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">When</p>
                      <p className="text-sm font-medium text-foreground">
                        {formatDateInZone(state.startTime, tz)} · {formatTimeInZone(state.startTime, tz)}–{formatTimeInZone(state.endTime, tz)}
                      </p>
                    </div>
                  ) : null}
                  {type.maxBookingsPerSlot > 1 && type.manageCapacity ? (
                    <div className="flex items-center justify-between gap-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Seats</p>
                      <Input
                        id="capacity"
                        type="number"
                        min={1}
                        max={type.maxBookingsPerSlot}
                        value={state.capacityBooked}
                        className="w-20 text-right"
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
                    <div className="flex items-center justify-between py-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Price</p>
                      <p className="text-sm font-semibold text-forest">{formatPrice(type.advancePaymentAmount)}</p>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between py-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Price</p>
                      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">Free</span>
                    </div>
                  )}
                </div>
              </div>

              <Button
                size="lg"
                className="w-full"
                onClick={handleConfirm}
                disabled={
                  selectedSlotFilled
                    ? true
                    : isApprovalFlow
                      ? submitRequest.isPending ||
                        !state.startTime ||
                        !state.endTime
                      : !state.slotLockId ||
                        createAppt.isPending ||
                        acquire.isPending
                }
              >
                {(isApprovalFlow ? submitRequest.isPending : createAppt.isPending) ? (
                  <Spinner className="mr-2 size-4" />
                ) : null}
                {isApprovalFlow
                  ? "Submit request"
                  : type.advancePaymentEnabled
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

        <div className="sticky bottom-0 mt-10 border-t border-border bg-white/95 px-6 py-4 backdrop-blur-sm">
          <div className="mx-auto flex w-full max-w-2xl items-center justify-between">
            <Button
              variant="ghost"
              className="text-muted-foreground"
              disabled={state.step === steps[0] || state.step === "payment"}
              onClick={state.step === "review" ? goBackFromReview : goPrev}
            >
              ← Back
            </Button>

            {state.step !== "review" && state.step !== "payment" ? (
              <Button
                size="lg"
                className="min-w-[140px]"
                disabled={continueDisabled}
                onClick={onContinueFromQuestionsOrPrior}
              >
                Continue →
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </CheckoutShell>
  );
}
