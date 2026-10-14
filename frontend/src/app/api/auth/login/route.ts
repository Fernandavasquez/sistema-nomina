import { cookies } from 'next/headers';
import { BACKEND_URL, cookieOptions, forwardedFor, TOKEN_COOKIE } from '@/lib/server-config';

/**
 * Login: envía las credenciales al backend y, si son correctas, guarda el JWT
 * en una cookie httpOnly. Al navegador solo se le devuelven los datos del usuario.
 */
export async function POST(request: Request) {
  const body = await request.text();

  let res: Response;
  try {
    res = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': forwardedFor(request) },
      body,
      cache: 'no-store',
    });
  } catch {
    return Response.json({ message: 'No se pudo conectar con el servidor' }, { status: 503 });
  }

  const data = await res.json();
  if (!res.ok) return Response.json(data, { status: res.status });

  (await cookies()).set(TOKEN_COOKIE, data.accessToken, cookieOptions);
  return Response.json({ usuario: data.usuario });
}
