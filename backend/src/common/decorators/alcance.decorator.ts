import { createParamDecorator, ExecutionContext, ForbiddenException, NotFoundException } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthUser } from './current-user.decorator.js';

/**
 * Qué empresas abarca una petición:
 *  - `permitidas`: las que el usuario puede ver (el administrador, todas).
 *  - `seleccionada`: la elegida arriba en el menú (encabezado X-Empresa-Id), o null si eligió "Todas".
 *  - `ids`: las que se deben mostrar en listados y reportes (la seleccionada, o todas las permitidas).
 */
export interface Alcance {
  permitidas: number[];
  seleccionada: number | null;
  ids: number[];
}

export const ENCABEZADO_EMPRESA = 'x-empresa-id';

export function crearAlcance(user: AuthUser, encabezado?: string | string[]): Alcance {
  const permitidas = user.empresaIds;
  const valor = Array.isArray(encabezado) ? encabezado[0] : encabezado;
  let seleccionada: number | null = null;
  if (valor && valor !== 'todas') {
    seleccionada = Number(valor);
    if (!Number.isInteger(seleccionada) || !permitidas.includes(seleccionada)) {
      throw new ForbiddenException('No tiene acceso a la empresa seleccionada');
    }
  }
  // Sin empresas asignadas no se ve nada (id 0 nunca existe; evita un IN vacío).
  const ids = seleccionada ? [seleccionada] : permitidas.length ? permitidas : [0];
  return { permitidas, seleccionada, ids };
}

/** Inyecta el alcance de empresas de la petición: `metodo(@AlcanceEmpresas() alcance: Alcance)`. */
export const AlcanceEmpresas = createParamDecorator((_data: unknown, ctx: ExecutionContext): Alcance => {
  const request = ctx.switchToHttp().getRequest<Request & { user: AuthUser }>();
  return crearAlcance(request.user, request.headers[ENCABEZADO_EMPRESA]);
});

/** Un registro de una empresa a la que el usuario no tiene acceso se trata como inexistente. */
export function assertAccesoEmpresa(alcance: Alcance, empresaId: number, noEncontrado: string) {
  if (!alcance.permitidas.includes(empresaId)) throw new NotFoundException(noEncontrado);
}

/**
 * Empresa para un registro nuevo: la indicada en el formulario o, si no, la seleccionada en el menú.
 * Debe ser una de las permitidas.
 */
export function empresaParaCrear(alcance: Alcance, empresaId?: number): number {
  const id = empresaId ?? alcance.seleccionada;
  if (!id) throw new ForbiddenException('Seleccione la empresa');
  if (!alcance.permitidas.includes(id)) throw new ForbiddenException('No tiene acceso a esa empresa');
  return id;
}
