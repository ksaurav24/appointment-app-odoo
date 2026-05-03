import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

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

  @ApiPropertyOptional({ example: 'treatment-room', maxLength: 80 })
  @IsOptional()
  @IsString()
  @MaxLength(80)
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
