import type {
  NoShowFeatureInput,
  NoShowScore,
} from '../domain/models.ts';
import type { MlModelPort } from '../ports/ml-model.port.ts';
import { normalizeStatusToken } from '../shared/normalizers.ts';
import { buildNoShowFeatures } from './feature-builder.ts';

export interface ScoreNoShowInput extends NoShowFeatureInput {
  model?: MlModelPort | null;
}

export async function scoreNoShow(
  input: ScoreNoShowInput,
): Promise<NoShowScore> {
  const features = buildNoShowFeatures(input);

  if (input.model) {
    try {
      return await input.model.scoreNoShow(features);
    } catch {
      // Fall back to deterministic heuristics when the optional scorer is unavailable.
    }
  }

  const score = clampScore(calculateHeuristicScore(features));
  const riskBand = resolveRiskBand(score);

  return {
    score,
    riskBand,
  };
}

function calculateHeuristicScore(
  input: Awaited<ReturnType<typeof buildNoShowFeatures>>,
): number {
  return (
    0.12 +
    scorePaymentSignals(input) +
    scoreRescheduleSignals(input) +
    scoreTimingSignals(input) +
    scorePolicySignals(input) +
    scoreHistorySignals(input) +
    scoreCancellationSignals(input)
  );
}

function clampScore(value: number): number {
  return Math.min(0.99, Math.max(0.01, Number(value.toFixed(3))));
}

function resolveRiskBand(score: number): NoShowScore['riskBand'] {
  if (score >= 0.65) {
    return 'high';
  }

  if (score >= 0.35) {
    return 'medium';
  }

  return 'low';
}

function scorePaymentSignals(
  input: Awaited<ReturnType<typeof buildNoShowFeatures>>,
): number {
  let score = 0;
  const paymentStatus = input.paymentStatus ?? null;
  const normalizedStatus =
    paymentStatus === null ? null : normalizeStatusToken(paymentStatus);

  if (normalizedStatus === null || normalizedStatus === 'PENDING') {
    score += 0.12;
  } else if (
    ['PAID', 'SUCCEEDED', 'CAPTURED', 'SETTLED'].includes(
      normalizedStatus,
    )
  ) {
    score -= 0.08;
  }

  if (input.advancePaymentEnabled && normalizedStatus === null) {
    score += 0.04;
  }

  if (input.paymentLeadHours !== null && input.paymentLeadHours !== undefined) {
    if (input.paymentLeadHours >= 24) {
      score -= 0.05;
    } else if (input.paymentLeadHours <= 2) {
      score += 0.03;
    }
  }

  return score;
}

function scoreRescheduleSignals(
  input: Awaited<ReturnType<typeof buildNoShowFeatures>>,
): number {
  let score = Math.min(input.rescheduleCount, 3) * 0.08;

  if (
    input.rescheduleCountLast30Days !== null &&
    input.rescheduleCountLast30Days !== undefined
  ) {
    if (input.rescheduleCountLast30Days >= 4) {
      score += 0.08;
    } else if (input.rescheduleCountLast30Days >= 2) {
      score += 0.05;
    }
  }

  if (
    input.lastRescheduleLeadHours !== null &&
    input.lastRescheduleLeadHours !== undefined &&
    input.lastRescheduleLeadHours <= 24
  ) {
    score += 0.04;
  }

  if (
    input.maxReschedulesAllowed !== null &&
    input.maxReschedulesAllowed !== undefined &&
    input.rescheduleCount >= input.maxReschedulesAllowed
  ) {
    score += 0.05;
  }

  return score;
}

function scoreTimingSignals(
  input: Awaited<ReturnType<typeof buildNoShowFeatures>>,
): number {
  let score = 0;

  if (input.durationMins >= 60) {
    score += 0.05;
  }

  if (input.startsAtHour < 9 || input.startsAtHour >= 18) {
    score += 0.05;
  }

  if (input.bookingLeadHours !== null && input.bookingLeadHours !== undefined) {
    if (input.bookingLeadHours <= 2) {
      score += 0.05;
    } else if (input.bookingLeadHours >= 24) {
      score -= 0.03;
    }
  }

  return score;
}

function scorePolicySignals(
  input: Awaited<ReturnType<typeof buildNoShowFeatures>>,
): number {
  let score = 0;

  if (!input.cancellationAllowed) {
    score += 0.03;
  }

  if (!input.rescheduleAllowed) {
    score += 0.03;
  }

  if (input.manualConfirmation) {
    score -= 0.02;
  }

  return score;
}

function scoreHistorySignals(
  input: Awaited<ReturnType<typeof buildNoShowFeatures>>,
): number {
  const historyWeight = Math.min(1, input.organizationHistorySize / 50);
  let score = 0;

  score += (input.organizationNoShowRate ?? 0) * 0.3 * historyWeight;
  score += (input.appointmentTypeNoShowRate ?? 0) * 0.3 * historyWeight;
  score += (input.customerNoShowRate ?? 0) * 0.2 * historyWeight;
  score += (input.bookablePersonNoShowRate ?? 0) * 0.2 * historyWeight;
  score += (input.bookableResourceNoShowRate ?? 0) * 0.2 * historyWeight;

  return score;
}

function scoreCancellationSignals(
  input: Awaited<ReturnType<typeof buildNoShowFeatures>>,
): number {
  let score = 0;

  if (input.wasCancelled) {
    score += 0.08;
  }

  if (input.cancelLeadHours !== null && input.cancelLeadHours !== undefined) {
    if (input.cancelLeadHours >= 24) {
      score -= 0.04;
    } else if (input.cancelLeadHours <= 1) {
      score += 0.03;
    }
  }

  if (input.cancelWithinWindow === true) {
    score -= 0.06;
  }

  return score;
}
