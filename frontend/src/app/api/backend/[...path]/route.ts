import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { BACKEND_URL, cookieOptions, forwardedFor, TOKEN_COOKIE } from '@/lib/server-config';

/**
 * Proxy hacia la API de NestJS ("Backend for Frontend").
 * El navegador llama a /api/backend/empleados y este handler reenvía a
 * http://backend:3000/api/empleados agregando el token de la cookie httpOnly.
 * Así el token nunca queda expuesto al JavaScript del navegador.
 */
async function handler(request: NextRequest, ctx: RouteContext<'/api/backend/[...path]'>) {
  const { path } = await ctx.params;
  const token = request.cookies.get(TOKEN_COOKIE)?.value;
  if (!token) return Response.json({ statusCode: 401, message: 'Sesión expirada' }, { status: 401 });

  const url = `${BACKEND_URL}/api/${path.map(encodeURIComponent).join('/')}${request.nextUrl.search}`;
  const headers = new Headers({ Authorization: `Bearer ${token}`, 'X-Forwarded-For': forwardedFor(request) });
  const contentType = request.headers.get('content-type');
  if (contentType) headers.set('Content-Type', contentType);
  // Empresa elegida en el selector del menú.
  const empresa = request.headers.get('x-empresa-id');
  if (empresa) headers.set('X-Empresa-Id', empresa);

  const hasBody = !['GET', 'HEAD'].includes(request.method);
  let res: Response;
  try {
    res = await fetch(url, {
      method: request.method,
      headers,
      body: hasBody ? await request.arrayBuffer() : undefined,
      cache: 'no-store',
    });
  } catch {
    return Response.json({ statusCode: 503, message: 'No se pudo conectar con el servidor' }, { status: 503 });
  }

  // Cada petición con sesión válida renueva el plazo de 1 hora; un 401 la borra.
  const jar = await cookies();
  if (res.status === 401) jar.delete(TOKEN_COOKIE);
  else jar.set(TOKEN_COOKIE, token, cookieOptions);

  const responseHeaders = new Headers();
  for (const name of ['content-type', 'content-disposition', 'content-length']) {
    const value = res.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }
  responseHeaders.set('Cache-Control', 'no-store');
  return new Response(res.body, { status: res.status, headers: responseHeaders });
}

export { handler as GET, handler as POST, handler as PATCH, handler as PUT, handler as DELETE };
