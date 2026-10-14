import { cookies } from 'next/headers';
import { cookieOptions, TOKEN_COOKIE } from '@/lib/server-config';

/**
 * Renueva el plazo de inactividad de la cookie sin llamar al backend.
 * El navegador lo usa cuando el usuario está activo (escribiendo, moviendo el mouse)
 * pero lleva un rato sin hacer peticiones a la API.
 */
export async function POST() {
  const jar = await cookies();
  const token = jar.get(TOKEN_COOKIE)?.value;
  if (!token) return Response.json({ ok: false }, { status: 401 });
  jar.set(TOKEN_COOKIE, token, cookieOptions);
  return Response.json({ ok: true });
}
