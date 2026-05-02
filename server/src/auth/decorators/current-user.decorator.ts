import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import type { Request } from 'express';
import type { JwtUserPayload } from '../token.service';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtUserPayload | undefined => {
    const req = ctx.switchToHttp().getRequest<Request>();
    const user = req.user as JwtUserPayload | undefined;
    return user;
  },
);
