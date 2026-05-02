import { Controller, Get, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Prisma, Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { ListAdminAppointmentsQuery } from './dto/list-admin-appointments.query';

const APPOINTMENT_INCLUDE = {
  appointmentType: { select: { id: true, name: true, slug: true } },
  customer: { select: { id: true, email: true, fullName: true } },
  organization: { select: { id: true, name: true, slug: true } },
  bookablePerson: { select: { id: true, name: true } },
  bookableResource: { select: { id: true, name: true } },
} satisfies Prisma.AppointmentInclude;

const APPOINTMENT_OMIT = { id: true } satisfies Prisma.AppointmentOmit;

@ApiTags('admin')
@ApiCookieAuth('access')
@Roles(Role.ADMIN)
@Controller('admin/appointments')
export class AdminAppointmentsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({
    summary: 'Admin: list appointments across all organisations',
  })
  async list(@Query() query: ListAdminAppointmentsQuery) {
    const where: Prisma.AppointmentWhereInput = {};
    if (query.organizationId) where.organizationId = query.organizationId;
    if (query.customerId) where.customerId = query.customerId;
    if (query.appointmentTypeId)
      where.appointmentTypeId = query.appointmentTypeId;
    if (query.status) where.status = query.status;
    const startTime: Prisma.DateTimeFilter = {};
    if (query.from) startTime.gte = new Date(query.from);
    if (query.to) startTime.lte = new Date(query.to);
    if (query.upcomingOnly) startTime.gte = new Date();
    if (Object.keys(startTime).length > 0) where.startTime = startTime;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.appointment.findMany({
        where,
        include: APPOINTMENT_INCLUDE,
        omit: APPOINTMENT_OMIT,
        orderBy: { startTime: 'desc' },
        skip: query.skip,
        take: query.take,
      }),
      this.prisma.appointment.count({ where }),
    ]);

    return { items, total, skip: query.skip, take: query.take };
  }
}
