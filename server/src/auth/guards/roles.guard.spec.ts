import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { RolesGuard } from './roles.guard';

import type { ExecutionContext } from '@nestjs/common';

function makeContext(user: { role: Role } | undefined): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

function makeReflector(map: Record<string, unknown>): Reflector {
  return {
    getAllAndOverride: (key: string) => map[key],
  } as unknown as Reflector;
}

describe('RolesGuard', () => {
  it('allows when route is public', () => {
    const guard = new RolesGuard(makeReflector({ 'auth:isPublic': true }));
    expect(guard.canActivate(makeContext(undefined))).toBe(true);
  });

  it('allows when no @Roles metadata is present', () => {
    const guard = new RolesGuard(makeReflector({}));
    expect(guard.canActivate(makeContext({ role: Role.CUSTOMER }))).toBe(true);
  });

  it('throws when role does not match required', () => {
    const guard = new RolesGuard(makeReflector({ 'auth:roles': [Role.ADMIN] }));
    expect(() =>
      guard.canActivate(makeContext({ role: Role.CUSTOMER })),
    ).toThrow(ForbiddenException);
  });

  it('allows when role matches', () => {
    const guard = new RolesGuard(
      makeReflector({ 'auth:roles': [Role.ADMIN, Role.ORGANIZER] }),
    );
    expect(guard.canActivate(makeContext({ role: Role.ORGANIZER }))).toBe(true);
  });

  it('throws when authenticated user is missing', () => {
    const guard = new RolesGuard(makeReflector({ 'auth:roles': [Role.ADMIN] }));
    expect(() => guard.canActivate(makeContext(undefined))).toThrow(
      ForbiddenException,
    );
  });
});
