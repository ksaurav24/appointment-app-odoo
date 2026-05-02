import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class AppointmentAnswerDto {
  @IsString()
  questionId!: string;

  @IsOptional()
  @IsString()
  answerText?: string | null;
}

export class CreateAppointmentDto {
  @IsString()
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
