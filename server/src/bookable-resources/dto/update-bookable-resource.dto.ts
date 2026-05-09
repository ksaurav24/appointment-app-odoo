import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { RESOURCE_TYPE_VALUES } from './resource-type';

export class UpdateBookableResourceDto {
  @ApiPropertyOptional({
    example: 'Operatory 2 (renovated)',
    minLength: 1,
    maxLength: 120,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({
    example: 'ROOM',
    enum: RESOURCE_TYPE_VALUES,
  })
  @IsOptional()
  @IsString()
  @IsIn(RESOURCE_TYPE_VALUES)
  resourceType?: string;

  @ApiPropertyOptional({
    example: 'Newly renovated operatory with upgraded chair and 4K monitor.',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ example: 2, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @ApiPropertyOptional({ example: '2nd floor, Wing B', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
