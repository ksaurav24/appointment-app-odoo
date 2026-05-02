import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { SLUG_REGEX } from '../../utils/slug';

export class CreateOrganizationDto {
  @ApiProperty({ example: 'Acme Dental Clinic', minLength: 2, maxLength: 120 })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @ApiProperty({
    example: 'acme-dental-clinic',
    description:
      'URL-safe slug used in public booking links (lowercase letters, numbers, hyphens)',
    minLength: 3,
    maxLength: 60,
  })
  @IsString()
  @MinLength(3)
  @MaxLength(60)
  @Matches(SLUG_REGEX, {
    message: 'slug must be lowercase letters, numbers and hyphens',
  })
  slug!: string;

  @ApiPropertyOptional({
    example: 'reception@acme-dental.com',
    description:
      'Public-facing contact email. Defaults to the organizer account email when omitted.',
  })
  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ example: '+91-9876543210', maxLength: 40 })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  contactPhone?: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @ApiPropertyOptional({
    example: 'Asia/Kolkata',
    description: 'IANA timezone identifier',
    maxLength: 64,
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  timezone?: string;
}
