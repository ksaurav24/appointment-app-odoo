import { Controller, Get, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminAuditLogsService } from './admin-audit-logs.service';
import { ListAuditLogsQuery } from './dto/list-audit-logs.query';

@ApiTags('admin')
@ApiCookieAuth('access')
@Roles(Role.ADMIN)
@Controller('admin/audit-logs')
export class AdminAuditLogsController {
  constructor(private readonly auditLogs: AdminAuditLogsService) {}

  @Get()
  @ApiOperation({
    summary: 'Admin: list audit log entries with filters and pagination',
  })
  list(@Query() query: ListAuditLogsQuery) {
    return this.auditLogs.list(query);
  }
}
