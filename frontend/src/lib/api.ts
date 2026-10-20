import { encabezadoEmpresa, guardarEmpresaActual } from './empresa-actual';

/** Mensaje del backend cuando la empresa recordada ya no es válida para este usuario. */
const SIN_ACCESO_EMPRESA = 'No tiene acceso a la empresa seleccionada';

/**
 * Cliente HTTP del frontend. Todas las llamadas pasan por /api/backend (proxy de Next.js),
 * que agrega el token desde la cookie httpOnly.
 */

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const isForm = body instanceof FormData;
  const res = await fetch(`/api/backend${path}`, {
    method,
    headers: { ...encabezadoEmpresa(), ...(body && !isForm ? { 'Content-Type': 'application/json' } : {}) },
    body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
  });

  if (res.status === 401) {
    // Token vencido o usuario desactivado: limpiar sesión y volver al login.
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.assign(`/login?next=${encodeURIComponent(window.location.pathname)}`);
    throw new ApiError(401, 'Su sesión expiró. Ingrese de nuevo.');
  }

  const data = res.headers.get('content-type')?.includes('application/json') ? await res.json() : null;
  if (res.status === 403 && data?.message === SIN_ACCESO_EMPRESA) {
    // Otro usuario en este navegador, o la empresa ya no está asignada: se vuelve a "Todas".
    guardarEmpresaActual('todas');
    window.location.reload();
  }
  if (!res.ok) {
    // NestJS devuelve `message` como texto o como lista de errores de validación.
    const message = Array.isArray(data?.message) ? data.message.join('. ') : data?.message;
    throw new ApiError(res.status, message ?? 'Ocurrió un error inesperado');
  }
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body ?? {}),
  patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
};

/** Arma un query string ignorando valores vacíos: qs({ estado: 'ACTIVO', buscar: '' }) → '?estado=ACTIVO' */
export function qs(params: Record<string, string | number | boolean | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : '';
}
