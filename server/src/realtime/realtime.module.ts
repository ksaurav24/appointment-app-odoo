import { Global, Module } from '@nestjs/common';
import { AvailabilityEmitter } from './availability.emitter';
import { AvailabilityGateway } from './availability.gateway';

/**
 * Global so any service can inject `AvailabilityEmitter` without each
 * feature module importing RealtimeModule.
 */
@Global()
@Module({
  providers: [AvailabilityGateway, AvailabilityEmitter],
  exports: [AvailabilityGateway, AvailabilityEmitter],
})
export class RealtimeModule {}
