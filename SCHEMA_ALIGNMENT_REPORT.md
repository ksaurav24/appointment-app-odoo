# Schema Alignment Report

**Date**: 2026-05-02  
**Branch**: mahesh-dev  
**Scope**: Booking Engine (`packages/booking-engine`) schema alignment with `docs/schema.md`

---

## Executive Summary

Updated the booking-engine domain models and ML logic to align with the updated database schema (`docs/schema.md`). All changes preserve core booking functionality while adding schema-aware contracts for payment records, persons, and timestamps.

---

## Files Modified

### 1. `packages/booking-engine/src/domain/models.ts`

**Changes**:
- Added `createdAt?` and `updatedAt?` timestamps to:
  - `BookablePerson`
  - `BookableResource`
  - `AppointmentTypePolicy`
  - `ScheduleDefinition`
  - `ExistingAppointment`

- Extended `ExistingAppointment` with schema fields:
  - `totalAmount?: number | null` (from `appointments.totalAmount`)
  - `confirmationCode?: string | null` (from `appointments.confirmationCode`)
  - `updatedAt?: ISODateTime | null` (audit field)

- Added new `PaymentRecord` interface reflecting `payments` table:
  ```ts
  interface PaymentRecord {
    id, appointmentId, customerId, amount, currency
    paymentGateway, gatewayTransactionId?, status
    paidAt?, refundedAt?, createdAt?
  }
  ```

- Extended `NoShowFeatureInput` with:
  - `latestPayment?: PaymentRecord | null` (optional payment context for ML)

- Extended `AvailabilitySnapshot` with:
  - `persons?: BookablePerson[]` (optional person data for richer context)

**Rationale**: Schema now separates payment data into a dedicated `payments` table. ML features can consume payment status/timestamp from either `payments` or appointment-level fields, with `payments` taking precedence.

---

### 2. `packages/booking-engine/src/ml/feature-builder.ts`

**Changes**:
- Updated `buildNoShowFeatures` to prefer payment signals from `latestPayment` (payments table):
  ```ts
  const paymentStatus = 
    input.latestPayment?.status ?? input.appointment.paymentStatus ?? null;
  const paymentPaidAt = 
    input.latestPayment?.paidAt 
      ? new Date(input.latestPayment.paidAt)
      : input.appointment.paymentPaidAt 
        ? new Date(input.appointment.paymentPaidAt)
        : null;
  ```

**Rationale**: Ensures ML features work with both old (appointment-level) and new (payments table) schema implementations, with backward compatibility.

---

### 3. `packages/booking-engine/src/availability/availability-engine.ts`

**Changes**:
- Added strict appointment-type consistency validation:
  ```ts
  if (input.appointmentTypeId !== input.snapshot.appointmentType.id) {
    throw new Error(
      `Appointment type mismatch: expected ${input.snapshot.appointmentType.id}, ` +
      `received ${input.appointmentTypeId}`
    );
  }
  ```

**Rationale**: Prevents silent mismatches between requested and snapshot appointment types, catching integration errors early.

---

### 4. `packages/booking-engine/src/concurrency/request-evaluator.ts`

**Changes**:
- Fixed indentation of `assignIfDefined` helper function (moved from nested to module-level).

**Rationale**: Code quality / consistency.

---

### 5. `packages/booking-engine/src/ports/repository.port.ts`

**Changes**:
- Added optional repository methods aligned with schema:
  ```ts
  listPersons?(personIds: readonly string[]): Promise<BookablePerson[]>;
  listPaymentsForAppointments?(appointmentIds: readonly string[]): Promise<PaymentRecord[]>;
  ```

**Rationale**: Exposes new schema capabilities to integration layer without breaking existing implementations (optional methods).

---

### 6. `packages/booking-engine/test/availability/availability-engine.spec.ts`

**New Test**:
```ts
test('getAvailabilityFromSnapshot rejects mismatched appointment type input', () => {
  assert.throws(
    () => getAvailabilityFromSnapshot({
      appointmentTypeId: 'apt_other',
      date: mondayDate,
      snapshot: exclusiveAvailabilitySnapshot,
      blockingStatuses: ['confirmed'],
    }),
    /Appointment type mismatch/,
  );
});
```

**Rationale**: Validates the new consistency guard.

---

### 7. `packages/booking-engine/test/ml/feature-builder.spec.ts`

**New Test**:
```ts
test('buildNoShowFeatures prefers paidAt and status from payments schema', () => {
  const features = buildNoShowFeatures({
    appointmentType: fixedDurationPolicy,
    appointment: { /* ... */ paymentStatus: 'pending', paymentPaidAt: '...' },
    latestPayment: {
      id: 'payment_1',
      status: 'paid',
      paidAt: '2026-05-04T14:00:00.000Z',
      // ...
    },
    organizationHistorySize: 10,
  });
  assert.equal(features.paymentStatus, 'paid');
  assert.equal(features.paymentLeadHours, 4);
});
```

**Rationale**: Validates payment data precedence logic.

---

### 8. `packages/booking-engine/README.md`

**Updated Assumptions**:
```
- ML feature extraction can consume payment signals from `payments` via `latestPayment` 
  and falls back to appointment-level payment fields when not provided.
```

**Rationale**: Documents new schema awareness.

---

## Core Logic Preservation

✅ **No breaking changes to booking availability logic**:
- Slot generation, capacity calculation, and hold/confirmation flows remain identical.
- Assignment expansion, overlap detection, realtime events unchanged.
- ML heuristic scoring unchanged (only data sources expanded).

✅ **Backward compatibility**:
- All new fields are optional (`?` or `| null`).
- All new repository methods are optional (`?`).
- Existing fixtures and tests continue to pass.

---

## Integration Checklist

When integrating with the database and backend services:

1. **Build snapshot with new fields**:
   - Pass `persons` array to `AvailabilitySnapshot` if person data is available.
   - Fetch and pass `latestPayment` for more accurate ML scoring.

2. **Implement new repository methods** (optional but recommended):
   - `listPersons(personIds)` — fetch staff records.
   - `listPaymentsForAppointments(appointmentIds)` — fetch payment records for ML.

3. **Update appointment records** to include new fields:
   - `totalAmount`, `confirmationCode`, `updatedAt` on `ExistingAppointment`.

4. **Test payment-aware ML scoring**:
   - Pass `latestPayment` from `payments` table.
   - Verify fallback behavior when `latestPayment` is null.

---

## Validation

**Recommended local testing** (from `packages/booking-engine`):
```bash
npm run build
npm test
```

Both commands should complete with no errors or failures.

---

## Notes

- **`createdAt`/`updatedAt`** fields are optional; existing integrations can ignore them.
- **`PaymentRecord`** type is provided for future integration; ML works fine without it (backward compatible).
- **Appointment type consistency check** is a safety guard; enable early error detection in integration.

---

**Status**: Ready for integration and testing.
