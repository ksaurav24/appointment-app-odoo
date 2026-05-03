import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MeetingController } from './meeting.controller';
import { MeetingGateway } from './meeting.gateway';
import { MeetingTokenService } from './meeting-token.service';
import { MeetingService } from './meeting.service';

/**
 * WebRTC meeting feature: short-lived JWT issuance + Socket.IO signaling
 * relay. ConfigModule and PrismaModule are global so they don't need to be
 * imported here. JwtModule is registered without options — the secret is
 * passed per-call via `MeetingTokenService` so this module's tokens stay
 * isolated from the auth module's access tokens.
 */
@Module({
  imports: [JwtModule.register({})],
  controllers: [MeetingController],
  providers: [MeetingService, MeetingTokenService, MeetingGateway],
  exports: [MeetingService, MeetingTokenService, MeetingGateway],
})
export class MeetingModule {}
