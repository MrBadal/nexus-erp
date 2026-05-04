import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface JwtPayload {
  sub: string;
  email: string;
  tenantId: string;
  roleId: string;
  permissions: string[];
  firstName: string;
  lastName: string;
  /** Linked employee record (null for admin users with no HR profile). Used by SelfScopedGuard for ESS routes. */
  employeeId?: string | null;
  /** Role slug — used by frontend to choose post-login redirect (employee → /ess, others → /dashboard). */
  roleSlug?: string;
}

export const CurrentUser = createParamDecorator(
  (data: keyof JwtPayload | undefined, ctx: ExecutionContext): any => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as JwtPayload;

    if (!user) {
      return null;
    }

    return data ? user[data] : user;
  },
);
