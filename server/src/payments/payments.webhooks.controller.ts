import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '../auth/decorators/public.decorator';
import { PaymentsService } from './payments.service';

@ApiTags('webhooks')
@Public()
@Controller('webhooks/razorpay')
export class PaymentsWebhooksController {
  constructor(private readonly payments: PaymentsService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Razorpay webhook receiver (HMAC verified)' })
  async handle(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-razorpay-signature') signature: string | undefined,
  ): Promise<{ ok: true }> {
    if (!signature) {
      throw new BadRequestException('Missing X-Razorpay-Signature header');
    }
    if (!req.rawBody) {
      throw new BadRequestException(
        'Missing raw request body — webhook route requires rawBody parser',
      );
    }
    await this.payments.handleWebhook(req.rawBody.toString('utf8'), signature);
    return { ok: true };
  }
}
