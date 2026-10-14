import { NextResponse, type NextRequest } from 'next/server';

const TOKEN_COOKIE = 'nomina_token';

/**
 * Revisión rápida antes de mostrar una página: sin cookie de sesión → al login.
 * La validación real del token la hace el backend en cada petición.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const logueado = request.cookies.has(TOKEN_COOKIE);
  const esLogin = pathname === '/login';

  if (!logueado && !esLogin) {
    const url = new URL('/login', request.url);
    if (pathname !== '/') url.searchParams.set('next', pathname + search);
    return NextResponse.redirect(url);
  }
  // Cierre por inactividad: se borra la cookie aunque una petición en curso la haya renovado.
  if (esLogin && request.nextUrl.searchParams.get('motivo') === 'inactividad') {
    const res = NextResponse.next();
    res.cookies.delete(TOKEN_COOKIE);
    return res;
  }
  if (logueado && esLogin) return NextResponse.redirect(new URL('/', request.url));
  return NextResponse.next();
}

export const config = {
  // Todas las páginas, excepto rutas /api, archivos de Next y archivos estáticos.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)'],
};
