import { IsISO8601, IsOptional, IsString, Matches } from 'class-validator';

export class DurationOptionsQuery {
  @IsISO8601({ strict: true, strictSeparator: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be YYYY-MM-DD' })
  date!: string;

  @IsISO8601()
  startTime!: string;

  @IsOptional()
  @IsString()
  entityId?: string;

  @IsOptional()
  @IsString()
  timezone?: string;
}
