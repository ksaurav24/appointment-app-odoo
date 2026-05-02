import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RejectOrganizationDto {
  @ApiPropertyOptional({
    example:
      'Submitted business documents could not be verified. Please re-upload a valid GST certificate and a recent utility bill.',
    description:
      'Reason shown to the organisation owner explaining the rejection',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}
