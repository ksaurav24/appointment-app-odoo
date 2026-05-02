import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class CreatePaymentIntentDto {
  @ApiProperty({
    example: 'APT-2026-0000451',
    description:
      'Public id (confirmation code) of the appointment to create a Razorpay order for',
    maxLength: 64,
  })
  @IsString()
  @MaxLength(64)
  appointmentPublicId!: string;
}
