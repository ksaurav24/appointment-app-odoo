import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
  @ApiProperty({
    example: '42',
    description: 'Numeric id of the booking question (string-encoded)',
  })
  @IsNumberString({ no_symbols: true })
  questionId!: string;

  @ApiPropertyOptional({
    example: 'Mild lower back pain for the last two weeks; no prior surgery.',
    description:
      'Customer-provided answer text (may be null for skipped optional questions)',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  answerText?: string | null;
}

export class CreateAppointmentDto {
  @ApiProperty({
    example: '1057',
    description:
      'Numeric id (string-encoded) of the slot lock acquired during checkout. Locks expire after a few minutes if not converted.',
  })
  @IsNumberString({ no_symbols: true })
  slotLockId!: string;

  @ApiPropertyOptional({
    example: 1,
    description:
      'Number of capacity units to reserve (group bookings). Defaults to 1.',
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  capacityBooked?: number;

  @ApiPropertyOptional({
    type: () => AppointmentAnswerDto,
    isArray: true,
    description:
      'Answers to the booking-questions defined on the appointment type',
    example: [
      {
        questionId: '42',
        answerText:
          'Mild lower back pain for the last two weeks; no prior surgery.',
      },
      {
        questionId: '43',
        answerText: 'Yes, I am bringing my previous MRI report.',
      },
    ],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => AppointmentAnswerDto)
  answers?: AppointmentAnswerDto[];
}
