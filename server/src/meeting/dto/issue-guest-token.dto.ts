import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

/**
 * Body posted to `POST /appointments/:id/meeting-token/guest`.
 * Grants a short-lived join token when `confirmationCode` matches the
 * appointment's confirmation code. No JWT auth on this endpoint — the
 * confirmation code IS the credential.
 */
export class IssueGuestTokenDto {
  @ApiProperty({
    example: 'A8B-3K2-XYZ',
    description: 'Customer-facing confirmation code from the booking email.',
  })
  @IsString()
  @IsNotEmpty()
  confirmationCode!: string;
}
