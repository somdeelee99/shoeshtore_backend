import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface AuthUser {
  id: string;
  email?: string | null;
  phone?: string | null;
  role: 'ADMIN' | 'STAFF' | 'CUSTOMER';
  name: string;
  avatar?: string | null;
  scope: 'admin' | 'app';
}

export const CurrentUser = createParamDecorator((data: keyof AuthUser | undefined, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  const user: AuthUser = request.user;
  return data ? user?.[data] : user;
});
