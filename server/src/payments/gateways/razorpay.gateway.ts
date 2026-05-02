import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import { EnvVars } from '../../config/env.validation';
import {
  CreateOrderInput,
  CreateOrderResult,
  PaymentGateway,
  RefundInput,
  RefundResult,
  VerifyPaymentInput,
  VerifyWebhookInput,
} from './payment-gateway.interface';

const RAZORPAY_API_BASE = 'https://api.razorpay.com/v1';

interface RazorpayOrderResponse {
  id: string;
  amount: number;
  currency: string;
  status: string;
}

interface RazorpayRefundResponse {
  id: string;
  payment_id: string;
  amount: number;
  status: string;
}

/**
 * Razorpay gateway. HMAC verification runs entirely against the configured
 * secrets — no network call. Order creation and refunds use the Razorpay REST
 * API via fetch with HTTP basic auth.
 */
@Injectable()
export class RazorpayGateway implements PaymentGateway {
  readonly providerName = 'razorpay';
  private readonly logger = new Logger(RazorpayGateway.name);
  private readonly keyId: string | undefined;
  private readonly keySecret: string | undefined;
  private readonly webhookSecret: string | undefined;

  constructor(config: ConfigService<EnvVars, true>) {
    this.keyId = config.get('RAZORPAY_KEY_ID', { infer: true });
    this.keySecret = config.get('RAZORPAY_KEY_SECRET', { infer: true });
    this.webhookSecret = config.get('RAZORPAY_WEBHOOK_SECRET', { infer: true });
  }

  async createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
    this.requireApiCredentials();
    const res = await fetch(`${RAZORPAY_API_BASE}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${this.basicAuth()}`,
      },
      body: JSON.stringify({
        amount: input.amount,
        currency: input.currency,
        receipt: input.receipt,
        notes: input.notes,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      this.logger.error(
        `Razorpay createOrder failed status=${res.status} body=${body}`,
      );
      throw new ServiceUnavailableException(
        'Failed to create payment order with the gateway',
      );
    }
    const data = (await res.json()) as RazorpayOrderResponse;
    return {
      orderId: data.id,
      amount: data.amount,
      currency: data.currency,
    };
  }

  verifyPaymentSignature(input: VerifyPaymentInput): void {
    if (!this.keySecret) {
      throw new ServiceUnavailableException(
        'Payment gateway is not configured',
      );
    }
    const expected = createHmac('sha256', this.keySecret)
      .update(`${input.orderId}|${input.paymentId}`)
      .digest('hex');
    if (!safeEqualHex(expected, input.signature)) {
      throw new UnauthorizedException('Invalid payment signature');
    }
  }

  verifyWebhookSignature(input: VerifyWebhookInput): void {
    if (!this.webhookSecret) {
      throw new ServiceUnavailableException('Webhook secret is not configured');
    }
    const expected = createHmac('sha256', this.webhookSecret)
      .update(input.rawBody)
      .digest('hex');
    if (!safeEqualHex(expected, input.signature)) {
      throw new UnauthorizedException('Invalid webhook signature');
    }
  }

  async refund(input: RefundInput): Promise<RefundResult> {
    this.requireApiCredentials();
    const res = await fetch(
      `${RAZORPAY_API_BASE}/payments/${encodeURIComponent(input.paymentId)}/refund`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${this.basicAuth()}`,
        },
        body: JSON.stringify({ amount: input.amount }),
      },
    );
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      this.logger.error(
        `Razorpay refund failed status=${res.status} body=${body}`,
      );
      throw new ServiceUnavailableException(
        'Failed to issue refund with the gateway',
      );
    }
    const data = (await res.json()) as RazorpayRefundResponse;
    return { refundId: data.id };
  }

  private requireApiCredentials(): void {
    if (!this.keyId || !this.keySecret) {
      throw new ServiceUnavailableException(
        'Payment gateway is not configured (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET missing)',
      );
    }
  }

  private basicAuth(): string {
    return Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');
  }
}

/**
 * Constant-time hex string comparison. Both sides must be equal length and
 * valid hex; on mismatch we still run the comparison to avoid early-exit
 * timing leaks.
 */
function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
  } catch {
    throw new BadRequestException('Malformed signature');
  }
}
