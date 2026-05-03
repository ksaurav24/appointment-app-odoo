import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class PaginationQuery {
  @ApiPropertyOptional({ example: 0, default: 0, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip: number = 0;

  @ApiPropertyOptional({ example: 20, default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  take: number = 20;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  skip: number;
  take: number;
}
