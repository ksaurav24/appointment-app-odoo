import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BookableResource, Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { JwtUserPayload } from '../auth/token.service';
import { BookableResourcesService } from './bookable-resources.service';
import type { ResourceUtilizationReport } from './bookable-resources.service';
import { CreateBookableResourceDto } from './dto/create-bookable-resource.dto';
import { ListBookableResourcesQuery } from './dto/list-bookable-resources.query';
import { UpdateBookableResourceDto } from './dto/update-bookable-resource.dto';

@ApiTags('bookable-resources')
@ApiCookieAuth('access')
@Roles(Role.ORGANIZER)
@Controller('bookable-resources')
export class BookableResourcesController {
  constructor(private readonly resources: BookableResourcesService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a bookable resource in the current organization',
  })
  create(
    @CurrentUser() user: JwtUserPayload,
    @Body() body: CreateBookableResourceDto,
  ): Promise<BookableResource> {
    return this.resources.create(user.sub, body);
  }

  @Get()
  @ApiOperation({
    summary: "List the current organization's bookable resources",
  })
  list(
    @CurrentUser() user: JwtUserPayload,
    @Query() query: ListBookableResourcesQuery,
  ): Promise<BookableResource[]> {
    return this.resources.list(user.sub, query.includeInactive ?? false);
  }

  @Get('utilization-report')
  @ApiOperation({
    summary:
      'Get per-resource utilization (day/week/month) and revenue totals for the current organization',
  })
  utilizationReport(
    @CurrentUser() user: JwtUserPayload,
  ): Promise<ResourceUtilizationReport> {
    return this.resources.utilizationReport(user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Fetch a bookable resource by id' })
  findOne(
    @CurrentUser() user: JwtUserPayload,
    @Param('id') id: string,
  ): Promise<BookableResource> {
    return this.resources.findOneForOrganiser(user.sub, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a bookable resource' })
  update(
    @CurrentUser() user: JwtUserPayload,
    @Param('id') id: string,
    @Body() body: UpdateBookableResourceDto,
  ): Promise<BookableResource> {
    return this.resources.update(user.sub, id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Delete a bookable resource (hard if unused, soft otherwise to preserve booking history)',
  })
  remove(
    @CurrentUser() user: JwtUserPayload,
    @Param('id') id: string,
  ): Promise<{ deleted: 'soft' | 'hard' }> {
    return this.resources.remove(user.sub, id);
  }
}
