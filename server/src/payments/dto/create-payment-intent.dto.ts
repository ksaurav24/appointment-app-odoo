import { IsString, MaxLength } from 'class-validator';

export class CreatePaymentIntentDto {
  @IsString()
  @MaxLength(64)
  appointmentPublicId!: string;
}
