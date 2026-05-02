import { SetMetadata } from '@nestjs/common';

export const SKIP_ORG_APPROVAL_KEY = 'auth:skipOrgApproval';
export const SkipOrganizationApproval = (): MethodDecorator & ClassDecorator =>
  SetMetadata(SKIP_ORG_APPROVAL_KEY, true);
