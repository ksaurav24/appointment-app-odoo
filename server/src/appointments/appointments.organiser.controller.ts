import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import type { Request } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { JwtUserPayload } from '../auth/token.service';
import { auditRequestMeta } from '../utils/request';
import {
  AppointmentsService,
  AppointmentWithRelations,
} from './appointments.service';
import { CancelAppointmentDto } from './dto/cancel-appointment.dto';
import { ListAppointmentsQuery } from './dto/list-appointments.query';
import { RejectAppointmentDto } from './dto/reject-appointment.dto';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';

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

  @Get(':publicId')
  @ApiOperation({ summary: 'Fetch an appointment in the current organization' })
  findOne(
    @CurrentUser() user: JwtUserPayload,
    @Param('publicId') publicId: string,
  ): Promise<AppointmentWithRelations> {
    return this.appointments.findOneForOrganiser(user.sub, publicId);
  }

  @Post(':publicId/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Approve a PENDING appointment (manual confirmation)',
  })
  approve(
    @CurrentUser() user: JwtUserPayload,
    @Param('publicId') publicId: string,
  ): Promise<AppointmentWithRelations> {
    return this.appointments.approve(user.sub, publicId);
  }

  @Post(':publicId/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reject a PENDING appointment with an optional reason',
  })
  reject(
    @CurrentUser() user: JwtUserPayload,
    @Param('publicId') publicId: string,
    @Body() body: RejectAppointmentDto,
  ): Promise<AppointmentWithRelations> {
    return this.appointments.reject(user.sub, publicId, body.reason);
  }

  @Post(':publicId/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a CONFIRMED appointment as completed' })
  complete(
    @CurrentUser() user: JwtUserPayload,
    @Param('publicId') publicId: string,
  ): Promise<AppointmentWithRelations> {
    return this.appointments.markCompleted(user.sub, publicId);
  }

  @Post(':publicId/no-show')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a CONFIRMED appointment as a no-show' })
  noShow(
    @CurrentUser() user: JwtUserPayload,
    @Param('publicId') publicId: string,
  ): Promise<AppointmentWithRelations> {
    return this.appointments.markNoShow(user.sub, publicId);
  }

  @Post(':publicId/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Organiser-initiated cancellation (manual override; bypasses customer policy)',
  })
  cancel(
    @CurrentUser() user: JwtUserPayload,
    @Param('publicId') publicId: string,
    @Body() body: CancelAppointmentDto,
    @Req() req: Request,
  ): Promise<AppointmentWithRelations> {
    return this.appointments.cancelByOrganiser(
      user.sub,
      publicId,
      body,
      auditRequestMeta(req),
    );
  }

  @Post(':publicId/reschedule')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Organiser-initiated reschedule (manual override; bypasses customer policy)',
  })
  reschedule(
    @CurrentUser() user: JwtUserPayload,
    @Param('publicId') publicId: string,
    @Body() body: RescheduleAppointmentDto,
    @Req() req: Request,
  ): Promise<AppointmentWithRelations> {
    return this.appointments.rescheduleByOrganiser(
      user.sub,
      publicId,
      body,
      auditRequestMeta(req),
    );
  }
}
