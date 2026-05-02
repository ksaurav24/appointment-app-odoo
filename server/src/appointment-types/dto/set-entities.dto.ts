import { ArrayUnique, IsArray, IsString, MinLength } from 'class-validator';

export class SetEntitiesDto {
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  @MinLength(1, { each: true })
  entityIds!: string[];
}
