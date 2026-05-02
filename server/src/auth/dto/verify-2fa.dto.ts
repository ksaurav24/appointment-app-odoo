import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length } from 'class-validator';

export class VerifyTwoFactorDto {
  @ApiProperty({ example: 'aarav.sharma@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: '305219',
    description: '6-digit two-factor code emailed to the user',
    minLength: 6,
    maxLength: 6,
  })
  @IsString()
  @Length(6, 6)
  code!: string;
}
