# Payments (Razorpay)

The platform integrates Razorpay for advance-payment appointment types
(`AppointmentType.advancePaymentEnabled = true`). Two customer-facing
endpoints plus one webhook receiver.

* `server/src/payments/payments.controller.ts` — customer endpoints.
* `server/src/payments/payments.webhooks.controller.ts` — Razorpay webhook.
* DTOs in `server/src/payments/dto/`.

---

## Flow

```
1. Customer creates an appointment as usual (POST /appointments).
   For an advance-payment type, the resulting Appointment has
   status=PENDING (or whatever manualConfirmation dictates) and
   paymentStatus=PENDING.

2. POST /payments/intent  { appointmentPublicId }
   Backend creates a Razorpay order if not already created and returns
   { paymentPublicId, orderId, amount, currency, keyId }.

3. Frontend opens the Razorpay Checkout widget with `keyId`, `orderId`,
   and `amount`. Razorpay handles card / UPI / netbanking.

4. On checkout success, Razorpay calls back the SDK with
   { razorpay_order_id, razorpay_payment_id, razorpay_signature }.

5. POST /payments/verify with those three values.
   Backend verifies the HMAC. On success, marks Payment.status=PAID and
   advances Appointment.paymentStatus → PAID (and may flip status from
   PENDING → CONFIRMED if `manualConfirmation = false`).

6. Razorpay also calls our /webhooks/razorpay endpoint asynchronously.
   This is the source of truth — the verify endpoint is just a fast path
   to give the customer immediate UI feedback.
```

---

## POST `/payments/intent` (201)

* `@Roles(Role.CUSTOMER)`, JWT cookie required.
* Throttler `paymentIntent` — 5 / 10 min.

**Body** (`CreatePaymentIntentDto`):

| Field | Type | Validators |
|-------|------|-----------|
| `appointmentPublicId` | string | `@IsString()`, `@MaxLength(64)` (the cuid `publicId`) |

**Response 201** (`CreateIntentResult`):

```jsonc
{
  "paymentPublicId": "<cuid>",
  "orderId": "order_NaB2cD3eF4gH5i",   // Razorpay order id
  "amount": 50000,                      // minor units (paise for INR)
  "currency": "INR",
  "keyId": "rzp_test_xxx"               // public Razorpay key — safe in browser
}
```

**Idempotency:** repeated calls with the same appointment that has no
PAID payment return the same Razorpay order. After payment is PAID,
calling intent again returns 409.

**Errors:**

* 400 — appointment type doesn't require advance payment, or the
  configured `advancePaymentAmount` is missing.
* 404 — appointment not found, or owned by another customer.
* 409 — appointment not `PENDING`, or `paymentStatus` is not `PENDING`
  (already paid / failed and refunded).

> **Frontend tip:** treat `amount` as **minor units** (paise / cents).
> Format for display by dividing by 100. Don't display this raw to the user.

---

## POST `/payments/verify` (200)

* `@Roles(Role.CUSTOMER)`, JWT cookie required.
* Throttler `paymentVerify` — 10 / 10 min.
* `@HttpCode(HttpStatus.OK)` (so it's 200, not 201).

**Body** (`VerifyPaymentDto`):

| Field | Type | Validators |
|-------|------|-----------|
| `razorpayOrderId` | string | `@MaxLength(128)` |
| `razorpayPaymentId` | string | `@MaxLength(128)` |
| `razorpaySignature` | string | `@MaxLength(256)` |

The signature is HMAC-SHA256 of `${orderId}|${paymentId}` with the
Razorpay key secret — Razorpay returns it from the checkout SDK, the
frontend just forwards it.

**Response 200:**

```jsonc
{ "paymentPublicId": "<cuid>" }
```

**Errors:**

* 400 — invalid signature or malformed payload.
* 404 — payment record not found for that `razorpayOrderId`.

After this call succeeds, `GET /appointments/:publicId` will reflect the
new `paymentStatus`.

---

## POST `/webhooks/razorpay` (200)

Public (no auth). Verified via the `X-Razorpay-Signature` header against
the request's **raw body** (HMAC-SHA256 with `RAZORPAY_WEBHOOK_SECRET`).
The frontend should never call this endpoint — it is purely
server-to-server.

**Headers required:**

* `X-Razorpay-Signature` — HMAC of the raw body.

**Body:** the standard Razorpay webhook envelope. Events handled:

| Event | Effect |
|-------|--------|
| `payment.captured` | Marks Payment as `PAID`; advances appointment status appropriately |
| `payment.failed` | Marks Payment as `FAILED` |
| `refund.processed` / `refund.created` | Logged; payment is already in `REFUNDED` from refund initiation |
| anything else | logged at debug, ignored |

**Response 200:** `{ "ok": true }` for both processed and ignored events.

**Errors:**

* 400 — missing `X-Razorpay-Signature`, missing raw body, or invalid JSON.

---

## What the frontend cares about

* Always treat the **webhook** as the source of truth. The verify
  endpoint just unblocks the UI; if it's slow or temporarily 5xx, fall
  back to polling `GET /appointments/:publicId` for `paymentStatus`.
* `keyId` from the intent response is the public key — safe to embed
  in the Razorpay Checkout widget.
* For a refund flow, the customer-side `POST /appointments/:publicId/cancel`
  may trigger a refund (per the appointment type's policy) — there is no
  separate "refund" endpoint exposed to the customer.
