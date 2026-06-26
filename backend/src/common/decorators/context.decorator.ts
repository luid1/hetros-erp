import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext) =>
  ctx.switchToHttp().getRequest().user,
);

export const CurrentTenant = createParamDecorator((_: unknown, ctx: ExecutionContext) =>
  ctx.switchToHttp().getRequest().user?.tenantId,
);

export const CurrentFilial = createParamDecorator((_: unknown, ctx: ExecutionContext) =>
  ctx.switchToHttp().getRequest().headers['x-filial-id'],
);

export const Public = () => SetMetadata('isPublic', true);
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);
export const Modulo = (modulo: string) => SetMetadata('modulo', modulo);
export const SkipAudit = () => SetMetadata('skipAudit', true);
