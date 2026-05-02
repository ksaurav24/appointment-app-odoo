import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ example: 'Sup3r$ecret!Pass' })
  @IsString()
  currentPassword!: string;

  @ApiProperty({
    example: 'EvenStr0nger!Pass',
    minLength: 8,
    maxLength: 72,
  })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  newPassword!: string;
}
