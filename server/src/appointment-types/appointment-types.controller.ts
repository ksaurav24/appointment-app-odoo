import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppointmentType, Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { JwtUserPayload } from '../auth/token.service';
import {
  AppointmentTypeWithRelations,
  AppointmentTypesService,
} from './appointment-types.service';
import { CreateAppointmentTypeDto } from './dto/create-appointment-type.dto';
import { ListAppointmentTypesQuery } from './dto/list-appointment-types.query';
import { SetBookingQuestionsDto } from './dto/set-booking-questions.dto';
import { SetEntitiesDto } from './dto/set-entities.dto';
import { SetScheduleDto } from './dto/set-schedule.dto';
import { UpdateAppointmentTypeDto } from './dto/update-appointment-type.dto';

@ApiTags('appointment-types')
@ApiCookieAuth('access')
@Roles(Role.ORGANIZER)
@Controller('appointment-types')
export class AppointmentTypesController {
  constructor(private readonly appointmentTypes: AppointmentTypesService) {}

  @Post()
  @ApiOperation({
    summary:
      'Create an appointment type with entities, schedule, and questions',
  })
  create(
    @CurrentUser() user: JwtUserPayload,
    @Body() body: CreateAppointmentTypeDto,
  ): Promise<AppointmentTypeWithRelations> {
    return this.appointmentTypes.create(user.sub, body);
  }

  @Get()
  @ApiOperation({
    summary: "List the current organization's appointment types",
  })
  list(
    @CurrentUser() user: JwtUserPayload,
    @Query() query: ListAppointmentTypesQuery,
  ): Promise<AppointmentType[]> {
    return this.appointmentTypes.list(
      user.sub,
      query.published,
      query.visibility,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Fetch an appointment type with all sub-resources' })
  findOne(
    @CurrentUser() user: JwtUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AppointmentTypeWithRelations> {
    return this.appointmentTypes.findOneForOrganiser(user.sub, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update appointment type basics + policy' })
  update(
    @CurrentUser() user: JwtUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateAppointmentTypeDto,
  ): Promise<AppointmentTypeWithRelations> {
    return this.appointmentTypes.update(user.sub, id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete an appointment type (refused if bookings exist)',
  })
  async remove(
    @CurrentUser() user: JwtUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.appointmentTypes.remove(user.sub, id);
  }

  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Publish an appointment type for customer discovery',
  })
  publish(
    @CurrentUser() user: JwtUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AppointmentTypeWithRelations> {
    return this.appointmentTypes.publish(user.sub, id);
  }

  @Post(':id/unpublish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unpublish an appointment type' })
  unpublish(
    @CurrentUser() user: JwtUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AppointmentTypeWithRelations> {
    return this.appointmentTypes.unpublish(user.sub, id);
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive an appointment type' })
  archive(
    @CurrentUser() user: JwtUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AppointmentTypeWithRelations> {
    return this.appointmentTypes.archive(user.sub, id);
  }

  @Post(':id/unarchive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restore an archived appointment type as draft' })
  unarchive(
    @CurrentUser() user: JwtUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AppointmentTypeWithRelations> {
    return this.appointmentTypes.unarchive(user.sub, id);
  }

  @Post(':id/share-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Regenerate the private share token' })
  regenerateShareToken(
    @CurrentUser() user: JwtUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ shareToken: string }> {
    return this.appointmentTypes.regenerateShareToken(user.sub, id);
  }

  @Put(':id/entities')
  @ApiOperation({ summary: 'Replace the entity assignments' })
  setEntities(
    @CurrentUser() user: JwtUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: SetEntitiesDto,
  ): Promise<AppointmentTypeWithRelations> {
    return this.appointmentTypes.setEntities(user.sub, id, body.entityIds);
  }

  @Put(':id/schedule')
  @ApiOperation({ summary: 'Replace the schedule and all rules' })
  setSchedule(
    @CurrentUser() user: JwtUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: SetScheduleDto,
  ): Promise<AppointmentTypeWithRelations> {
    return this.appointmentTypes.setSchedule(
      user.sub,
      id,
      body.scheduleType,
      body.timezone,
      body.rules,
    );
  }

  @Put(':id/questions')
  @ApiOperation({ summary: 'Replace the booking question list' })
  setQuestions(
    @CurrentUser() user: JwtUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: SetBookingQuestionsDto,
  ): Promise<AppointmentTypeWithRelations> {
    return this.appointmentTypes.setBookingQuestions(
      user.sub,
      id,
      body.questions,
    );
  }
}
