import { Module } from '@nestjs/common';
import { REFUND_HANDLER } from '../common/refund-handler.token';
import { PaymentGateway } from './gateways/payment-gateway.interface';
import { PAYMENT_GATEWAY } from './gateways/payment-gateway.token';
import { RazorpayGateway } from './gateways/razorpay.gateway';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PaymentsWebhooksController } from './payments.webhooks.controller';

@Module({
  controllers: [PaymentsController, PaymentsWebhooksController],
  providers: [
    PaymentsService,
    RazorpayGateway,
    {
      provide: PAYMENT_GATEWAY,
      useExisting: RazorpayGateway,
    },
    {
      provide: REFUND_HANDLER,
      useExisting: PaymentsService,
    },
  ],
  exports: [PaymentsService, REFUND_HANDLER],
})
export class PaymentsModule {}

// Re-export the interface so consumers can type-import without reaching
// into the gateways/ directory.
export type { PaymentGateway };
