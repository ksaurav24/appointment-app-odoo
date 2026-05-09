import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
import { RESOURCE_TYPE_VALUES, type ResourceTypeValue } from './resource-type';

export class CreateBookableResourceDto {
  @ApiProperty({ example: 'Operatory 2', minLength: 1, maxLength: 120 })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @ApiProperty({
    example: 'ROOM',
    enum: RESOURCE_TYPE_VALUES,
    description: 'Resource category',
  })
  @IsString()
  @IsIn(RESOURCE_TYPE_VALUES)
  resourceType!: ResourceTypeValue;

  @ApiPropertyOptional({
    example:
      'Fully equipped operatory with digital X-ray and intraoral camera.',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'How many simultaneous bookings the resource can accommodate',
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @ApiPropertyOptional({
    example: '2nd floor, Wing B',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
