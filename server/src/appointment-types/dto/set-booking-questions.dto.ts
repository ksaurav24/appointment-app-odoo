import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { QuestionType } from '@prisma/client';

export class BookingQuestionDto {
  @ApiProperty({
    example: 'Briefly describe your symptoms',
    minLength: 1,
    maxLength: 500,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  questionText!: string;

  @ApiPropertyOptional({
    example: 'Please be brief — we will discuss details during the appointment',
    description:
      'Optional helper text shown below the question on the booking form',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  helpText?: string;

  @ApiProperty({ enum: QuestionType, example: QuestionType.TEXT })
  @IsEnum(QuestionType)
  questionType!: QuestionType;

  @ApiPropertyOptional({ example: true, default: false })
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @ApiPropertyOptional({
    example: ['First visit', 'Follow-up', 'Emergency'],
    description: 'Required for SINGLE_CHOICE / MULTI_CHOICE question types',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  options?: string[];

  @ApiPropertyOptional({
    example: 1,
    description: 'Sort order shown on the booking form (lower comes first)',
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;
}

export class SetBookingQuestionsDto {
  @ApiProperty({
    type: () => BookingQuestionDto,
    isArray: true,
    example: [
      {
        questionText: 'Briefly describe your symptoms',
        questionType: 'TEXT',
        isRequired: true,
        displayOrder: 0,
      },
      {
        questionText: 'Visit type',
        questionType: 'SINGLE_CHOICE',
        isRequired: true,
        options: ['First visit', 'Follow-up', 'Emergency'],
        displayOrder: 1,
      },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BookingQuestionDto)
  questions!: BookingQuestionDto[];
}
