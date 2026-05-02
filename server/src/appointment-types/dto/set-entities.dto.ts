import { ApiProperty } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsString, MinLength } from 'class-validator';

export class SetEntitiesDto {
  @ApiProperty({
    type: [String],
    description:
      'Numeric ids (string-encoded) of bookable_persons or bookable_resources linked to this appointment type. Must match the appointment type’s entityType.',
    example: ['12', '15', '17'],
  })
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  @MinLength(1, { each: true })
  entityIds!: string[];
}
