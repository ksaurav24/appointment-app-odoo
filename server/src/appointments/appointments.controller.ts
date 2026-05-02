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
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { ListAppointmentsQuery } from './dto/list-appointments.query';

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
}
