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
import { Throttle } from '@nestjs/throttler';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { JwtUserPayload } from '../auth/token.service';
import {
  AppointmentsService,
  AppointmentWithRelations,
} from './appointments.service';
import { CancelAppointmentDto } from './dto/cancel-appointment.dto';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { ListAppointmentsQuery } from './dto/list-appointments.query';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';

@ApiTags('appointments')
@ApiCookieAuth('access')
@Roles(Role.CUSTOMER)
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointments: AppointmentsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Confirm a booking from an active slot lock' })
  create(
    @CurrentUser() user: JwtUserPayload,
    @Body() body: CreateAppointmentDto,
  ): Promise<AppointmentWithRelations> {
    return this.appointments.create(user.sub, body);
  }

  @Get('me')
  @ApiOperation({ summary: 'List the current customer’s appointments' })
  listMine(
    @CurrentUser() user: JwtUserPayload,
    @Query() query: ListAppointmentsQuery,
  ): Promise<AppointmentWithRelations[]> {
    return this.appointments.listForCustomer(user.sub, query);
  }

  @Get(':publicId')
  @ApiOperation({ summary: 'Fetch the current customer’s appointment by id' })
  findOne(
    @CurrentUser() user: JwtUserPayload,
    @Param('publicId') publicId: string,
  ): Promise<AppointmentWithRelations> {
    return this.appointments.findOneForCustomer(user.sub, publicId);
  }

  @Post(':publicId/cancel')
  @HttpCode(HttpStatus.OK)
  @Throttle({ cancel: { limit: 10, ttl: 600_000 } })
  @ApiOperation({
    summary: 'Cancel an appointment (subject to the type’s policy)',
  })
  cancel(
    @CurrentUser() user: JwtUserPayload,
    @Param('publicId') publicId: string,
    @Body() body: CancelAppointmentDto,
  ): Promise<AppointmentWithRelations> {
    return this.appointments.cancelByCustomer(user.sub, publicId, body);
  }

  @Post(':publicId/reschedule')
  @HttpCode(HttpStatus.OK)
  @Throttle({ reschedule: { limit: 10, ttl: 600_000 } })
  @ApiOperation({
    summary:
      'Reschedule an appointment by submitting a fresh slot lock for the new time',
  })
  reschedule(
    @CurrentUser() user: JwtUserPayload,
    @Param('publicId') publicId: string,
    @Body() body: RescheduleAppointmentDto,
  ): Promise<AppointmentWithRelations> {
    return this.appointments.rescheduleByCustomer(user.sub, publicId, body);
  }
}
