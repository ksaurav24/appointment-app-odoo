import type {
  AvailabilityDay,
  AvailabilitySlot,
  OrganizerRecommendation,
  SlotRiskScore,
} from '../domain/models.ts';

export interface BuildOrganizerRecommendationsInput {
  availability: AvailabilityDay;
  slotRiskScores?: readonly SlotRiskScore[];
  highRiskThreshold?: number;
  overbookingThreshold?: number;
}

export function buildOrganizerRecommendations(
  input: BuildOrganizerRecommendationsInput,
): OrganizerRecommendation[] {
  const riskThreshold = input.highRiskThreshold ?? 0.65;
  const overbookingThreshold = input.overbookingThreshold ?? 0.8;
  const riskLookup = new Map(
    (input.slotRiskScores ?? []).map((slot) => [buildSlotKey(slot), slot]),
  );
  const recommendations: OrganizerRecommendation[] = [];
  const availableSlots = input.availability.slots.filter((slot) => slot.isAvailable);

  const bestSlot = availableSlots
    .map((slot) => ({
      slot,
      score: rankSlot(slot, riskLookup.get(buildSlotKey(slot))?.score ?? 0),
      riskScore: riskLookup.get(buildSlotKey(slot))?.score ?? 0,
    }))
    .slice()
    .sort(
      (
        left: { slot: AvailabilitySlot; score: number; riskScore: number },
        right: { slot: AvailabilitySlot; score: number; riskScore: number },
      ) => right.score - left.score,
    )[0];

  if (bestSlot) {
    recommendations.push({
      type: 'best_slot',
      severity: 'info',
      title: 'Best currently available slot',
      message: `Prefers stronger remaining capacity with lower no-show risk (${bestSlot.riskScore.toFixed(2)}).`,
      slotStart: bestSlot.slot.slotStart,
      slotEnd: bestSlot.slot.slotEnd,
      bookablePersonId: bestSlot.slot.bookablePersonId ?? null,
      bookableResourceId: bestSlot.slot.bookableResourceId ?? null,
      score: bestSlot.riskScore,
    });
  }

  for (const slotRisk of input.slotRiskScores ?? []) {
    if (slotRisk.score < riskThreshold) {
      continue;
    }

    const slot = input.availability.slots.find(
      (candidate) => buildSlotKey(candidate) === buildSlotKey(slotRisk),
    );

    if (!slot) {
      continue;
    }

    recommendations.push({
      type: 'high_risk_window',
      severity: 'warning',
      title: 'High-risk booking window',
      message: `This slot is trending toward no-show risk (${slotRisk.score.toFixed(2)}).`,
      slotStart: slot.slotStart,
      slotEnd: slot.slotEnd,
      bookablePersonId: slot.bookablePersonId ?? null,
      bookableResourceId: slot.bookableResourceId ?? null,
      score: slotRisk.score,
    });

    if (
      !slot.isAvailable &&
      slot.blockedReasons.includes('capacity_exhausted') &&
      slotRisk.score >= overbookingThreshold
    ) {
      recommendations.push({
        type: 'overbooking_suggestion',
        severity: 'warning',
        title: 'Review manual overbooking',
        message: 'Slot is full but historical risk is high enough to review a supervised overbooking decision.',
        slotStart: slot.slotStart,
        slotEnd: slot.slotEnd,
        bookablePersonId: slot.bookablePersonId ?? null,
        bookableResourceId: slot.bookableResourceId ?? null,
        score: slotRisk.score,
      });
    }
  }

  return recommendations;
}

function rankSlot(slot: AvailabilitySlot, riskScore: number): number {
  return slot.remainingCapacity * 10 - riskScore * 5;
}

function buildSlotKey(
  slot:
    | AvailabilitySlot
    | SlotRiskScore,
): string {
  return [
    slot.slotStart,
    slot.slotEnd,
    slot.bookablePersonId ?? 'none',
    slot.bookableResourceId ?? 'none',
  ].join('|');
}
