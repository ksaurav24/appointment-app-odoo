import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum } from 'class-validator';
import { OtpPurpose } from '@prisma/client';

export class ResendOtpDto {
  @ApiProperty({ example: 'aarav.sharma@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({
    enum: OtpPurpose,
    example: OtpPurpose.SIGNUP,
    description:
      'Which OTP flow to re-send (SIGNUP for email verification, LOGIN for 2FA, PASSWORD_RESET)',
  })
  @IsEnum(OtpPurpose)
  purpose!: OtpPurpose;
}
