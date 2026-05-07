import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { JwtUserPayload } from '../auth/token.service';
import {
  AppointmentsService,
  AppointmentWithRelations,
} from './appointments.service';
import { CreateAppointmentRequestDto } from './dto/create-appointment-request.dto';

/**
 * Public-facing controller for the manual-approval booking flow. Multiple
 * customers may submit competing PENDING requests for the same slot; the
 * organiser approves up to `maxBookingsPerSlot` of them via the
 * organiser-controller `/approve` endpoint, which auto-rejects siblings
 * once the slot fills.
 */
@ApiTags('public-appointment-requests')
@ApiCookieAuth('access')
@Roles(Role.CUSTOMER)
@Controller('public/appointment-types/:id/requests')
export class AppointmentsPublicController {
  constructor(private readonly appointments: AppointmentsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Submit an approval-required booking request (manualConfirmation types only)',
  })
  submit(
    @CurrentUser() user: JwtUserPayload,
    @Param('id') appointmentTypeId: string,
    @Body() body: CreateAppointmentRequestDto,
  ): Promise<AppointmentWithRelations> {
    return this.appointments.submitRequest(user.sub, appointmentTypeId, body);
  }
}
