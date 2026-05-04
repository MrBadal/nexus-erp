import { SetMetadata } from '@nestjs/common';

/**
 * Marks a route as scoped to the current employee — `SelfScopedGuard` will
 * reject the request if `req.user.employeeId` is null/undefined and force
 * downstream services to filter `WHERE employee_id = req.user.employeeId`.
 *
 * Usage:
 *   @ScopeToSelf()
 *   @Get('ess/leave/balance')
 *   getMyBalance(@CurrentUser() user: JwtPayload) { ... }
 */
export const SCOPE_TO_SELF_KEY = 'scopeToSelf';
export const ScopeToSelf = () => SetMetadata(SCOPE_TO_SELF_KEY, true);
