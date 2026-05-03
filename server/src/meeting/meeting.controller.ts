import {
  Body,
  Controller,
  Param,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { JwtUserPayload } from '../auth/token.service';
import { IssueGuestTokenDto } from './dto/issue-guest-token.dto';
import { MeetingService } from './meeting.service';
import { MeetingTokenResponse } from './types';

@ApiTags('meeting')
@Controller('appointments/:id/meeting-token')
export class MeetingController {
  constructor(private readonly meetingService: MeetingService) {}

  @Post()
  @ApiOperation({
    summary:
      'Issue a HOST meeting token. Caller must be the organiser of the appointment.',
  })
  async issueHostToken(
    @Param('id') id: string,
    @CurrentUser() user: JwtUserPayload | undefined,
  ): Promise<MeetingTokenResponse> {
    if (!user) throw new UnauthorizedException();
    return this.meetingService.issueToken(id, {
      role: 'HOST',
      userId: user.sub,
    });
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('guest')
  @ApiOperation({
    summary:
      'Issue a GUEST meeting token. Authorisation comes from the booking confirmation code in the body.',
  })
  async issueGuestToken(
    @Param('id') id: string,
    @Body() dto: IssueGuestTokenDto,
  ): Promise<MeetingTokenResponse> {
    return this.meetingService.issueToken(id, {
      role: 'GUEST',
      confirmationCode: dto.confirmationCode,
    });
  }
}
