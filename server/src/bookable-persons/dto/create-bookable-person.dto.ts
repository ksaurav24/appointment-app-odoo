import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateBookablePersonDto {
  @ApiProperty({ example: 'Dr. Priya Iyer', minLength: 1, maxLength: 120 })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @ApiProperty({
    example: 'priya.iyer@acme-dental.com',
    description: 'Email used to send booking notifications to the provider',
    maxLength: 254,
  })
  @IsEmail()
  @MaxLength(254)
  contactEmail!: string;

  @ApiPropertyOptional({ example: '+91-9876501234', maxLength: 40 })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @ApiPropertyOptional({
    example: 'Senior Orthodontist',
    description: 'Job title shown on the booking page',
    maxLength: 120,
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  designation?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Inactive providers are hidden from new bookings',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
