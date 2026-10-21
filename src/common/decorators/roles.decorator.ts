import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export type AppRole = 'ADMIN' | 'STAFF' | 'CUSTOMER';

/** Restrict a route to the given roles. */
export const Roles = (...roles: AppRole[]) => SetMetadata(ROLES_KEY, roles);

/** Marks a route as reachable without a JWT. */
export const PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(PUBLIC_KEY, true);
