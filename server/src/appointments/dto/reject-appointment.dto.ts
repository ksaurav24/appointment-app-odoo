import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RejectAppointmentDto {
  @ApiPropertyOptional({
    example:
      'Doctor unavailable that morning due to an emergency surgery — please pick another slot.',
    description:
      'Optional reason shown to the customer when rejecting a pending booking',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
