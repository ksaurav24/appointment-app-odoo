import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { SLUG_REGEX } from '../../utils/slug';

export class RegisterOrganizationDto {
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
    message:
      'organization.slug must be lowercase letters, numbers and hyphens (e.g. acme-clinic)',
  })
  slug!: string;

  @ApiProperty({ example: 'reception@acme-dental.com' })
  @IsEmail()
  contactEmail!: string;

  @ApiPropertyOptional({
    example:
      'Family-run dental clinic in Pune offering general dentistry, orthodontics, and cosmetic procedures.',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ example: '+91-9876543210', maxLength: 40 })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  contactPhone?: string;

  @ApiPropertyOptional({
    example: '4th Floor, Suncity Tower, FC Road, Pune 411004',
    maxLength: 500,
  })
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

export class RegisterDto {
  @ApiProperty({ example: 'aarav.sharma@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: 'Sup3r$ecret!Pass',
    minLength: 8,
    maxLength: 72,
  })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;

  @ApiProperty({ example: 'Aarav Sharma', minLength: 1, maxLength: 120 })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  fullName!: string;

  @ApiPropertyOptional({
    type: () => RegisterOrganizationDto,
    description:
      'When supplied, the user is registered as an organiser and an organisation is created and put into PENDING approval state',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => RegisterOrganizationDto)
  organization?: RegisterOrganizationDto;
}
