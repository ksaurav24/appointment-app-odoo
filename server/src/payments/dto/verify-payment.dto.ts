import { IsString, MaxLength } from 'class-validator';

export class VerifyPaymentDto {
  @IsString()
  @MaxLength(128)
  razorpayOrderId!: string;

  @IsString()
  @MaxLength(128)
  razorpayPaymentId!: string;

  @IsString()
  @MaxLength(256)
  razorpaySignature!: string;
}
