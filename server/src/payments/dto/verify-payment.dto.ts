import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class VerifyPaymentDto {
  @ApiProperty({
    example: 'order_NaB2cD3eF4gH5i',
    description: 'Razorpay order id returned by the create-intent endpoint',
    maxLength: 128,
  })
  @IsString()
  @MaxLength(128)
  razorpayOrderId!: string;

  @ApiProperty({
    example: 'pay_NaB2cD3eF4gH5j',
    description:
      'Razorpay payment id returned by the checkout widget on success',
    maxLength: 128,
  })
  @IsString()
  @MaxLength(128)
  razorpayPaymentId!: string;

  @ApiProperty({
    example: '0e3f1ab9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1',
    description:
      'HMAC-SHA256 signature of `${orderId}|${paymentId}` using the Razorpay key secret',
    maxLength: 256,
  })
  @IsString()
  @MaxLength(256)
  razorpaySignature!: string;
}
