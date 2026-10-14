import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

/** Datos del usuario autenticado que la estrategia JWT deja en `request.user`. */
export interface AuthUser {
  id: number;
  username: string;
  rol: string;
}

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthUser => {
  const request = ctx.switchToHttp().getRequest<Request & { user: AuthUser }>();
  return request.user;
});
