import { CanActivate, ExecutionContext, Injectable, BadRequestException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SCOPE_TO_SELF_KEY } from '../decorators/scope-to-self.decorator.js';
import { JwtPayload } from '../decorators/current-user.decorator.js';

/**
 * Guard that enforces ESS self-scoping.
 *
 * For any handler decorated with `@ScopeToSelf()`:
 *   - If the JWT carries an `employeeId`, attach it to `req.scopedEmployeeId`
 *     so downstream services can filter by it.
 *   - If the JWT does NOT carry an `employeeId` (e.g. an admin user with no
 *     linked employee record), reject with 400 — the route is meaningless
 *     without an employee context.
 *
 * Place AFTER `JwtAuthGuard` in the guard chain so `req.user` is populated.
 */
@Injectable()
export class SelfScopedGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const requiresScope = this.reflector.getAllAndOverride<boolean>(SCOPE_TO_SELF_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!requiresScope) return true;

    const req = ctx.switchToHttp().getRequest();
    const user = req.user as JwtPayload | undefined;
    if (!user) {
      throw new BadRequestException('Authentication required for self-scoped route');
    }
    if (!user.employeeId) {
      throw new BadRequestException(
        'This action requires an employee profile linked to your user account. Contact HR to link your account.',
      );
    }
    req.scopedEmployeeId = user.employeeId;
    return true;
  }
}
