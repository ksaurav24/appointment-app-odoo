import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
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
import { ListAppointmentsQuery } from './dto/list-appointments.query';
import { RejectAppointmentDto } from './dto/reject-appointment.dto';

@ApiTags('organiser-appointments')
@ApiCookieAuth('access')
@Roles(Role.ORGANIZER)
@Controller('organizations/me/appointments')
export class AppointmentsOrganiserController {
  constructor(private readonly appointments: AppointmentsService) {}

  @Get()
  @ApiOperation({ summary: 'List appointments in the current organization' })
  list(
    @CurrentUser() user: JwtUserPayload,
    @Query() query: ListAppointmentsQuery,
  ): Promise<AppointmentWithRelations[]> {
    return this.appointments.listForOrganiser(user.sub, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Fetch an appointment in the current organization' })
  findOne(
    @CurrentUser() user: JwtUserPayload,
    @Param('id') id: string,
  ): Promise<AppointmentWithRelations> {
    return this.appointments.findOneForOrganiser(user.sub, id);
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Approve a PENDING appointment (manual confirmation)',
  })
  approve(
    @CurrentUser() user: JwtUserPayload,
    @Param('id') id: string,
  ): Promise<AppointmentWithRelations> {
    return this.appointments.approve(user.sub, id);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reject a PENDING appointment with an optional reason',
  })
  reject(
    @CurrentUser() user: JwtUserPayload,
    @Param('id') id: string,
    @Body() body: RejectAppointmentDto,
  ): Promise<AppointmentWithRelations> {
    return this.appointments.reject(user.sub, id, body.reason);
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a CONFIRMED appointment as completed' })
  complete(
    @CurrentUser() user: JwtUserPayload,
    @Param('id') id: string,
  ): Promise<AppointmentWithRelations> {
    return this.appointments.markCompleted(user.sub, id);
  }

  @Post(':id/no-show')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a CONFIRMED appointment as a no-show' })
  noShow(
    @CurrentUser() user: JwtUserPayload,
    @Param('id') id: string,
  ): Promise<AppointmentWithRelations> {
    return this.appointments.markNoShow(user.sub, id);
  }
}
