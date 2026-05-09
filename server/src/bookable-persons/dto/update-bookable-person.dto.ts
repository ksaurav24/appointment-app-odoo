import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { StaffAvailabilityOverrideDto } from './create-bookable-person.dto';

const IN_PHONE_REGEX = /^\d{10}$/;

export class UpdateBookablePersonDto {
  @ApiPropertyOptional({
    example: 'Dr. Priya Iyer',
    minLength: 1,
    maxLength: 120,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({ example: 'Lead Orthodontist', maxLength: 120 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  designation?: string;

  @ApiPropertyOptional({
    example: 'priya.iyer@acme-dental.com',
    maxLength: 254,
  })
  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  contactEmail?: string;

  @ApiPropertyOptional({
    example: '9876501234',
    description: 'India contact number: exactly 10 digits',
  })
  @IsOptional()
  @IsString()
  @Matches(IN_PHONE_REGEX, {
    message: 'phone must be exactly 10 digits',
  })
  phone?: string;

  @ApiPropertyOptional({
    type: [String],
    format: 'uuid',
    description: 'Replaces assigned appointment types when provided',
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  appointmentTypeIds?: string[];

  @ApiPropertyOptional({
    type: [StaffAvailabilityOverrideDto],
    description:
      'Replaces per-appointment-type availability overrides when provided',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StaffAvailabilityOverrideDto)
  availabilityOverrides?: StaffAvailabilityOverrideDto[];

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
