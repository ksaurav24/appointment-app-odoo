import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppointmentType } from '@prisma/client';
import { Public } from '../auth/decorators/public.decorator';
import {
  AppointmentTypeWithRelations,
  AppointmentTypesService,
} from './appointment-types.service';

@ApiTags('public-appointment-types')
@Public()
@Controller('public/appointment-types')
export class AppointmentTypesPublicController {
  constructor(private readonly appointmentTypes: AppointmentTypesService) {}

  @Get()
  @ApiOperation({
    summary: 'List published appointment types from approved organizations',
  })
  list(): Promise<AppointmentType[]> {
    return this.appointmentTypes.publicList();
  }

  @Get('share/:token')
  @ApiOperation({
    summary:
      'Fetch an appointment type by private share token (bypasses isPublished)',
  })
  findByShareToken(
    @Param('token') token: string,
  ): Promise<AppointmentTypeWithRelations> {
    return this.appointmentTypes.publicFindByShareToken(token);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Fetch a published appointment type with all sub-resources',
  })
  findOne(@Param('id') id: string): Promise<AppointmentTypeWithRelations> {
    return this.appointmentTypes.publicFindById(id);
  }
}
