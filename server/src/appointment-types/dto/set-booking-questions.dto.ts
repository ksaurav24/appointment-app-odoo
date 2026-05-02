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
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  questionText!: string;

  @IsEnum(QuestionType)
  questionType!: QuestionType;

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  options?: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;
}

export class SetBookingQuestionsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BookingQuestionDto)
  questions!: BookingQuestionDto[];
}
