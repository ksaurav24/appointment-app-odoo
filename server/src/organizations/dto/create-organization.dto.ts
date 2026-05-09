import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { SLUG_REGEX } from '../../utils/slug';

const IN_CONTACT_PHONE_REGEX = /^\d{10}$/;

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

  @ApiProperty({
    example:
      'Community sports arena with certified coaches and premium facilities.',
    minLength: 2,
    maxLength: 2000,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(2000)
  description!: string;

  @ApiProperty({
    example: '9876543210',
    description: 'India contact number: exactly 10 digits',
  })
  @IsString()
  @Matches(IN_CONTACT_PHONE_REGEX, {
    message: 'contactPhone must be exactly 10 digits',
  })
  contactPhone!: string;

  @ApiProperty({ example: 'Pune', minLength: 2, maxLength: 120 })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  city!: string;

  @ApiProperty({ example: 'Maharashtra', minLength: 2, maxLength: 120 })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  state!: string;

  @ApiProperty({
    example: 'Akurdi, Pune, Maharashtra 411035',
    maxLength: 500,
  })
  @IsString()
  @MaxLength(500)
  address!: string;

  @ApiPropertyOptional({
    example: 18.6505,
    description:
      'Latitude selected from Google Maps (optional fallback if Maps is unavailable)',
  })
  @IsOptional()
  @IsLatitude()
  latitude?: number;

  @ApiPropertyOptional({
    example: 73.7656,
    description:
      'Longitude selected from Google Maps (optional fallback if Maps is unavailable)',
  })
  @IsOptional()
  @IsLongitude()
  longitude?: number;

  @ApiPropertyOptional({
    example: 'ChIJI7QQAZw_wjsRkgf8g8d3ShM',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  googlePlaceId?: string;

  @ApiProperty({
    example:
      'https://res.cloudinary.com/demo/image/upload/v1234567890/organizations/logo.png',
    description: 'Cloudinary URL for organization logo',
  })
  @IsUrl({ require_protocol: true })
  @MaxLength(500)
  logoUrl!: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'Optional gallery images (max 5)',
    maxItems: 5,
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @ValidateIf((_, value) => Array.isArray(value))
  @IsUrl({ require_protocol: true }, { each: true })
  galleryImageUrls?: string[];

  @ApiPropertyOptional({
    example: 'https://instagram.com/acmeclinic',
  })
  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(500)
  instagramUrl?: string;

  @ApiPropertyOptional({
    example: 'https://facebook.com/acmeclinic',
  })
  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(500)
  facebookUrl?: string;

  @ApiPropertyOptional({
    example: 'https://twitter.com/acmeclinic',
  })
  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(500)
  twitterUrl?: string;

  @ApiPropertyOptional({
    example: 'https://acmeclinic.com',
  })
  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(500)
  websiteUrl?: string;

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
