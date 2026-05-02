import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { createHmac } from 'crypto';
import { RazorpayGateway } from './razorpay.gateway';

function makeConfig(values: Record<string, string>): ConfigService {
  return {
    get: (key: string) => values[key],
  } as unknown as ConfigService;
}

describe('RazorpayGateway signature verification', () => {
  const keySecret = 'rzp_test_secret_xxxxxxxx';
  const webhookSecret = 'rzp_webhook_secret_yyyyyyy';

  let gateway: RazorpayGateway;

  beforeEach(() => {
    gateway = new RazorpayGateway(
      makeConfig({
        RAZORPAY_KEY_ID: 'rzp_test_key',
        RAZORPAY_KEY_SECRET: keySecret,
        RAZORPAY_WEBHOOK_SECRET: webhookSecret,
      }),
    );
  });

  describe('verifyPaymentSignature', () => {
    it('passes for a valid {orderId}|{paymentId} HMAC', () => {
      const orderId = 'order_abc123';
      const paymentId = 'pay_def456';
      const signature = createHmac('sha256', keySecret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');
      expect(() =>
        gateway.verifyPaymentSignature({ orderId, paymentId, signature }),
      ).not.toThrow();
    });

    it('throws UnauthorizedException for an invalid signature', () => {
      const orderId = 'order_abc123';
      const paymentId = 'pay_def456';
      const wrongSignature = createHmac('sha256', 'wrong-secret')
        .update(`${orderId}|${paymentId}`)
        .digest('hex');
      expect(() =>
        gateway.verifyPaymentSignature({
          orderId,
          paymentId,
          signature: wrongSignature,
        }),
      ).toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException for tampered order/payment ids', () => {
      const orderId = 'order_abc123';
      const paymentId = 'pay_def456';
      const signature = createHmac('sha256', keySecret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');
      expect(() =>
        gateway.verifyPaymentSignature({
          orderId: 'order_TAMPERED',
          paymentId,
          signature,
        }),
      ).toThrow(UnauthorizedException);
    });
  });

  describe('verifyWebhookSignature', () => {
    it('passes for a valid raw-body HMAC', () => {
      const rawBody = JSON.stringify({ event: 'payment.captured', id: '1' });
      const signature = createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');
      expect(() =>
        gateway.verifyWebhookSignature({ rawBody, signature }),
      ).not.toThrow();
    });

    it('throws UnauthorizedException for a body that has been altered', () => {
      const rawBody = JSON.stringify({ event: 'payment.captured', id: '1' });
      const signature = createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');
      const tampered = rawBody.replace('payment.captured', 'refund.created');
      expect(() =>
        gateway.verifyWebhookSignature({ rawBody: tampered, signature }),
      ).toThrow(UnauthorizedException);
    });
  });
});
