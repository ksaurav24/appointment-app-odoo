import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'aarav.sharma@example.com' })
  @IsEmail()
  email!: string;
}
