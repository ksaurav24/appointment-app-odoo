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
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { JwtUserPayload } from '../auth/token.service';
import {
  BookablePersonWithAssignments,
  BookablePersonsService,
} from './bookable-persons.service';
import { CreateBookablePersonDto } from './dto/create-bookable-person.dto';
import { ListBookablePersonsQuery } from './dto/list-bookable-persons.query';
import { UpdateBookablePersonDto } from './dto/update-bookable-person.dto';

@ApiTags('bookable-persons')
@ApiCookieAuth('access')
@Roles(Role.ORGANIZER)
@Controller('bookable-persons')
export class BookablePersonsController {
  constructor(private readonly persons: BookablePersonsService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a bookable person in the current organization',
  })
  create(
    @CurrentUser() user: JwtUserPayload,
    @Body() body: CreateBookablePersonDto,
  ): Promise<BookablePersonWithAssignments> {
    return this.persons.create(user.sub, body);
  }

  @Get()
  @ApiOperation({ summary: "List the current organization's bookable persons" })
  list(
    @CurrentUser() user: JwtUserPayload,
    @Query() query: ListBookablePersonsQuery,
  ): Promise<BookablePersonWithAssignments[]> {
    return this.persons.list(user.sub, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Fetch a bookable person by id' })
  findOne(
    @CurrentUser() user: JwtUserPayload,
    @Param('id') id: string,
  ): Promise<BookablePersonWithAssignments> {
    return this.persons.findOneForOrganiser(user.sub, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a bookable person' })
  update(
    @CurrentUser() user: JwtUserPayload,
    @Param('id') id: string,
    @Body() body: UpdateBookablePersonDto,
  ): Promise<BookablePersonWithAssignments> {
    return this.persons.update(user.sub, id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Delete a bookable person (hard if unused, soft otherwise to preserve booking history)',
  })
  remove(
    @CurrentUser() user: JwtUserPayload,
    @Param('id') id: string,
  ): Promise<{ deleted: 'soft' | 'hard' }> {
    return this.persons.remove(user.sub, id);
  }
}
