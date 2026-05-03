import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class ChangeRoleDto {
  @ApiProperty({
    enum: Role,
    example: Role.ORGANIZER,
    description: 'New role to assign to the user',
  })
  @IsEnum(Role)
  role!: Role;

  @ApiPropertyOptional({
    example:
      'Promoted to organizer following onboarding call on 2026-04-30 with the operations team.',
    description: 'Optional human-readable justification recorded in audit log',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
