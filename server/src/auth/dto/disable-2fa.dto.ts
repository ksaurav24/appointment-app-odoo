import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class DisableTwoFactorDto {
  @ApiProperty({
    example: 'Sup3r$ecret!Pass',
    description: 'Caller’s current password — required to disable 2FA',
  })
  @IsString()
  currentPassword!: string;
}
