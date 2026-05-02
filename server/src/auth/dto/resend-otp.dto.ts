import { IsEmail, IsEnum } from 'class-validator';
import { OtpPurpose } from '@prisma/client';

export class ResendOtpDto {
  @IsEmail()
  email!: string;

  @IsEnum(OtpPurpose)
  purpose!: OtpPurpose;
}
