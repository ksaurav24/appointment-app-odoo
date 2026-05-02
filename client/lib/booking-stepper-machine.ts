// Pure reducer + step transition logic for the booking stepper.
// Kept separate from the React component so it can be reasoned about
// (and later tested) in isolation.

import type { AppointmentTypeWithRelations } from "@/types";

export type BookingStep =
  | "entity"
  | "date"
  | "time"
  | "duration"
  | "questions"
  | "review"
  | "payment";

export type BookingState = {
  step: BookingStep;
  entityId?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  durationMinutes?: number;
  capacityBooked: number;
  answers: Record<string, string>;
  slotLockId?: string;
  slotLockExpiresAt?: string;
  appointmentPublicId?: string;
};

export type BookingAction =
  | { type: "SET_ENTITY"; entityId: string }
  | { type: "SET_DATE"; date: string }
  | { type: "SET_TIME"; startTime: string; endTime?: string }
  | { type: "SET_DURATION"; durationMinutes: number; endTime: string }
  | { type: "SET_ANSWERS"; answers: Record<string, string> }
  | { type: "SET_CAPACITY"; capacityBooked: number }
  | {
      type: "SET_SLOT_LOCK";
      slotLockId: string;
      slotLockExpiresAt: string;
    }
  | { type: "CLEAR_SLOT_LOCK" }
  | { type: "SET_APPOINTMENT"; appointmentPublicId: string }
  | { type: "GO_TO_STEP"; step: BookingStep }
  | { type: "HYDRATE"; state: Partial<BookingState> & { step: BookingStep } };

export const INITIAL_STATE: BookingState = {
  step: "date",
  capacityBooked: 1,
  answers: {},
};

export function bookingReducer(
  state: BookingState,
  action: BookingAction,
): BookingState {
  switch (action.type) {
    case "SET_ENTITY":
      return { ...state, entityId: action.entityId };
    case "SET_DATE":
      return {
        ...state,
        date: action.date,
        startTime: undefined,
        endTime: undefined,
        durationMinutes: undefined,
      };
    case "SET_TIME":
      return {
        ...state,
        startTime: action.startTime,
        endTime: action.endTime ?? state.endTime,
        durationMinutes: undefined,
      };
    case "SET_DURATION":
      return {
        ...state,
        durationMinutes: action.durationMinutes,
        endTime: action.endTime,
      };
    case "SET_ANSWERS":
      return { ...state, answers: action.answers };
    case "SET_CAPACITY":
      return { ...state, capacityBooked: action.capacityBooked };
    case "SET_SLOT_LOCK":
      return {
        ...state,
        slotLockId: action.slotLockId,
        slotLockExpiresAt: action.slotLockExpiresAt,
      };
    case "CLEAR_SLOT_LOCK":
      return {
        ...state,
        slotLockId: undefined,
        slotLockExpiresAt: undefined,
      };
    case "SET_APPOINTMENT":
      return { ...state, appointmentPublicId: action.appointmentPublicId };
    case "GO_TO_STEP":
      return { ...state, step: action.step };
    case "HYDRATE":
      return { ...state, ...action.state };
    default:
      return state;
  }
}

export function activeSteps(type: AppointmentTypeWithRelations): BookingStep[] {
  const steps: BookingStep[] = [];
  if (type.assignmentMode === "MANUAL") steps.push("entity");
  steps.push("date", "time");
  if (type.durationMode === "VARIABLE") steps.push("duration");
  if (type.bookingQuestions.length > 0) steps.push("questions");
  steps.push("review");
  if (type.advancePaymentEnabled) steps.push("payment");
  return steps;
}

export function nextStep(
  current: BookingStep,
  type: AppointmentTypeWithRelations,
): BookingStep | null {
  const steps = activeSteps(type);
  const idx = steps.indexOf(current);
  if (idx === -1 || idx === steps.length - 1) return null;
  return steps[idx + 1];
}

export function prevStep(
  current: BookingStep,
  type: AppointmentTypeWithRelations,
): BookingStep | null {
  const steps = activeSteps(type);
  const idx = steps.indexOf(current);
  if (idx <= 0) return null;
  return steps[idx - 1];
}

export function stepNumber(
  current: BookingStep,
  type: AppointmentTypeWithRelations,
): { current: number; total: number } {
  const steps = activeSteps(type);
  const idx = steps.indexOf(current);
  return { current: idx + 1, total: steps.length };
}
