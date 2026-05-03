import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length } from 'class-validator';

export class VerifyEmailDto {
  @ApiProperty({ example: 'aarav.sharma@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: '482917',
    description: '6-digit one-time code emailed to the user',
    minLength: 6,
    maxLength: 6,
  })
  @IsString()
  @Length(6, 6)
  code!: string;
}
