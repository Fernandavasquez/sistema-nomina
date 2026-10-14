import 'server-only';
import { MINUTOS_INACTIVIDAD } from '@/lib/sesion';

/** URL del backend NestJS vista desde el servidor de Next.js (en Docker: http://backend:3000). */
export const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:3000';

/** Cookie httpOnly donde se guarda el JWT: el JavaScript del navegador no puede leerla. */
export const TOKEN_COOKIE = 'nomina_token';

export const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  // En producción con HTTPS ponga COOKIE_SECURE=true para que la cookie solo viaje cifrada.
  secure: process.env.COOKIE_SECURE === 'true',
  path: '/',
  // La cookie vence tras 1 hora sin uso; cada petición la renueva (ver api/backend y api/auth/renovar).
  // El JWT además tiene una duración máxima absoluta de 8 horas.
  maxAge: MINUTOS_INACTIVIDAD * 60,
};

/** Reenvía la IP real del usuario al backend (para el límite de intentos de login). */
export function forwardedFor(request: Request): string {
  return request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? '';
}
