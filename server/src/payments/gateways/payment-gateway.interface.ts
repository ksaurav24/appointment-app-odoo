/**
 * Provider-agnostic payment gateway contract. Implementations MUST be
 * idempotent on the gateway side: repeated calls for the same logical event
 * (e.g. webhook redeliveries) must not double-charge or double-refund.
 */
export interface PaymentGateway {
  /** Provider tag persisted in `Payment.paymentGateway` (e.g. "razorpay"). */
  readonly providerName: string;

  /** Create a remote order/intent. Returns ids needed to bootstrap the client checkout. */
  createOrder(input: CreateOrderInput): Promise<CreateOrderResult>;

  /**
   * Verify the {orderId}|{paymentId} signature returned by the client-side
   * checkout SDK. Throws if invalid, returns silently if valid.
   */
  verifyPaymentSignature(input: VerifyPaymentInput): void;

  /**
   * Verify a webhook signature against the raw request body. Throws if invalid.
   */
  verifyWebhookSignature(input: VerifyWebhookInput): void;

  /** Initiate a refund. Returns the gateway's refund id. */
  refund(input: RefundInput): Promise<RefundResult>;
}

export interface CreateOrderInput {
  amount: number; // smallest currency unit (paise, cents, …)
  currency: string;
  receipt: string;
  notes?: Record<string, string>;
}

export interface CreateOrderResult {
  orderId: string;
  amount: number;
  currency: string;
}

export interface VerifyPaymentInput {
  orderId: string;
  paymentId: string;
  signature: string;
}

export interface VerifyWebhookInput {
  rawBody: string;
  signature: string;
}

export interface RefundInput {
  paymentId: string;
  amount: number; // smallest currency unit
}

export interface RefundResult {
  refundId: string;
}
