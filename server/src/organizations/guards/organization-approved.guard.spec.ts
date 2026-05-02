import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { OrganizationApprovalStatus, Role } from '@prisma/client';
import { IS_PUBLIC_KEY } from '../../auth/decorators/public.decorator';
import { OrganizationsService } from '../organizations.service';
import { SKIP_ORG_APPROVAL_KEY } from '../decorators/skip-organization-approval.decorator';
import { OrganizationApprovedGuard } from './organization-approved.guard';

function makeContext(user: unknown): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

function makeReflector(metadata: Record<string, boolean>): Reflector {
  return {
    getAllAndOverride: <T>(key: string): T => metadata[key] as unknown as T,
  } as unknown as Reflector;
}

describe('OrganizationApprovedGuard', () => {
  const baseOrg = (status: OrganizationApprovalStatus) => ({
    id: 'org1',
    organiserId: 'u1',
    approvalStatus: status,
  });

  it('allows public routes without checking', async () => {
    const findByOrganiserId = jest.fn();
    const orgs = { findByOrganiserId } as unknown as OrganizationsService;
    const reflector = makeReflector({ [IS_PUBLIC_KEY]: true });
    const guard = new OrganizationApprovedGuard(reflector, orgs);
    await expect(guard.canActivate(makeContext(undefined))).resolves.toBe(true);
    expect(findByOrganiserId).not.toHaveBeenCalled();
  });

  it('allows routes with @SkipOrganizationApproval', async () => {
    const findByOrganiserId = jest.fn();
    const orgs = { findByOrganiserId } as unknown as OrganizationsService;
    const reflector = makeReflector({ [SKIP_ORG_APPROVAL_KEY]: true });
    const guard = new OrganizationApprovedGuard(reflector, orgs);
    const user = { sub: 'u1', email: 'a@b.c', role: Role.ORGANIZER };
    await expect(guard.canActivate(makeContext(user))).resolves.toBe(true);
    expect(findByOrganiserId).not.toHaveBeenCalled();
  });

  it('passes through ADMIN users', async () => {
    const findByOrganiserId = jest.fn();
    const orgs = { findByOrganiserId } as unknown as OrganizationsService;
    const guard = new OrganizationApprovedGuard(makeReflector({}), orgs);
    const user = { sub: 'admin', email: 'a@b.c', role: Role.ADMIN };
    await expect(guard.canActivate(makeContext(user))).resolves.toBe(true);
    expect(findByOrganiserId).not.toHaveBeenCalled();
  });

  it('passes through CUSTOMER users', async () => {
    const findByOrganiserId = jest.fn();
    const orgs = { findByOrganiserId } as unknown as OrganizationsService;
    const guard = new OrganizationApprovedGuard(makeReflector({}), orgs);
    const user = { sub: 'c1', email: 'a@b.c', role: Role.CUSTOMER };
    await expect(guard.canActivate(makeContext(user))).resolves.toBe(true);
    expect(findByOrganiserId).not.toHaveBeenCalled();
  });

  it('blocks ORGANIZER with PENDING org', async () => {
    const orgs = {
      findByOrganiserId: jest
        .fn()
        .mockResolvedValue(baseOrg(OrganizationApprovalStatus.PENDING)),
    } as unknown as OrganizationsService;
    const guard = new OrganizationApprovedGuard(makeReflector({}), orgs);
    const user = { sub: 'u1', email: 'a@b.c', role: Role.ORGANIZER };
    await expect(guard.canActivate(makeContext(user))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('blocks ORGANIZER with REJECTED org', async () => {
    const orgs = {
      findByOrganiserId: jest
        .fn()
        .mockResolvedValue(baseOrg(OrganizationApprovalStatus.REJECTED)),
    } as unknown as OrganizationsService;
    const guard = new OrganizationApprovedGuard(makeReflector({}), orgs);
    const user = { sub: 'u1', email: 'a@b.c', role: Role.ORGANIZER };
    await expect(guard.canActivate(makeContext(user))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('allows ORGANIZER with APPROVED org', async () => {
    const orgs = {
      findByOrganiserId: jest
        .fn()
        .mockResolvedValue(baseOrg(OrganizationApprovalStatus.APPROVED)),
    } as unknown as OrganizationsService;
    const guard = new OrganizationApprovedGuard(makeReflector({}), orgs);
    const user = { sub: 'u1', email: 'a@b.c', role: Role.ORGANIZER };
    await expect(guard.canActivate(makeContext(user))).resolves.toBe(true);
  });

  it('blocks ORGANIZER with no org', async () => {
    const orgs = {
      findByOrganiserId: jest.fn().mockResolvedValue(null),
    } as unknown as OrganizationsService;
    const guard = new OrganizationApprovedGuard(makeReflector({}), orgs);
    const user = { sub: 'u1', email: 'a@b.c', role: Role.ORGANIZER };
    await expect(guard.canActivate(makeContext(user))).rejects.toThrow(
      ForbiddenException,
    );
  });
});
