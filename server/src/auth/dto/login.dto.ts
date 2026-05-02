import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'aarav.sharma@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Sup3r$ecret!Pass', minLength: 8 })
  @IsString()
  password!: string;
}
