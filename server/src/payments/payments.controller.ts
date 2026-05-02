import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { JwtUserPayload } from '../auth/token.service';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { CreateIntentResult, PaymentsService } from './payments.service';

@ApiTags('payments')
@ApiCookieAuth('access')
@Roles(Role.CUSTOMER)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post('intent')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ paymentIntent: { limit: 5, ttl: 600_000 } })
  @ApiOperation({
    summary:
      'Create a Razorpay order for an appointment that requires advance payment',
  })
  createIntent(
    @CurrentUser() user: JwtUserPayload,
    @Body() body: CreatePaymentIntentDto,
  ): Promise<CreateIntentResult> {
    return this.payments.createIntent(user.sub, body.appointmentPublicId);
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @Throttle({ paymentVerify: { limit: 10, ttl: 600_000 } })
  @ApiOperation({
    summary: 'Verify the Razorpay checkout signature and mark the payment paid',
  })
  verify(
    @CurrentUser() user: JwtUserPayload,
    @Body() body: VerifyPaymentDto,
  ): Promise<{ paymentPublicId: string }> {
    return this.payments.verify(user.sub, body);
  }
}
