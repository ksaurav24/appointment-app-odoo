import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RejectOrganizerDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}
