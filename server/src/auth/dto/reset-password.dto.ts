import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({
    example: '7f3b9c4d5a6e8f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c',
    description:
      'Single-use reset token delivered via the password-reset email',
    minLength: 20,
    maxLength: 200,
  })
  @IsString()
  @MinLength(20)
  @MaxLength(200)
  token!: string;

  @ApiProperty({
    example: 'NewSup3r$ecret!Pass',
    minLength: 8,
    maxLength: 72,
  })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  newPassword!: string;
}
