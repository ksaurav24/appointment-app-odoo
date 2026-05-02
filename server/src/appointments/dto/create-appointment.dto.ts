import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsNumberString,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class AppointmentAnswerDto {
  @IsNumberString({ no_symbols: true })
  questionId!: string;

  @IsOptional()
  @IsString()
  answerText?: string | null;
}

export class CreateAppointmentDto {
  @IsNumberString({ no_symbols: true })
  slotLockId!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  capacityBooked?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => AppointmentAnswerDto)
  answers?: AppointmentAnswerDto[];
}
