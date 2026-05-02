import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role, SlotLock } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { JwtUserPayload } from '../auth/token.service';
import { ParseBigIntPipe } from '../common/pipes';
import { AcquireSlotLockDto } from './dto/acquire-slot-lock.dto';
import { SlotLocksService } from './slot-locks.service';

@ApiTags('slot-locks')
@ApiCookieAuth('access')
@Roles(Role.CUSTOMER)
@Controller('slot-locks')
export class SlotLocksController {
  constructor(private readonly slotLocks: SlotLocksService) {}

  @Post()
  @ApiOperation({
    summary: 'Acquire a 5-minute hold on a slot during the booking flow',
  })
  acquire(
    @CurrentUser() user: JwtUserPayload,
    @Body() body: AcquireSlotLockDto,
  ): Promise<SlotLock> {
    return this.slotLocks.acquire(user.sub, body);
  }

  @Get('me')
  @ApiOperation({ summary: 'List the current customer’s active slot locks' })
  listMine(@CurrentUser() user: JwtUserPayload): Promise<SlotLock[]> {
    return this.slotLocks.listForCustomer(user.sub);
  }

  @Post(':id/extend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Extend an active slot lock by 5 minutes' })
  extend(
    @CurrentUser() user: JwtUserPayload,
    @Param('id', ParseBigIntPipe) id: bigint,
  ): Promise<SlotLock> {
    return this.slotLocks.extend(user.sub, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Release a slot lock' })
  async release(
    @CurrentUser() user: JwtUserPayload,
    @Param('id', ParseBigIntPipe) id: bigint,
  ): Promise<void> {
    await this.slotLocks.release(user.sub, id);
  }
}
