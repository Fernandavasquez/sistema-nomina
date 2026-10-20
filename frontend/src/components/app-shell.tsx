'use client';

import clsx from 'clsx';
import {
  Banknote,
  Briefcase,
  Building2,
  CalendarRange,
  FileBarChart,
  HandCoins,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings2,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Suspense, useEffect, useState, type ReactNode } from 'react';
import { ControlInactividad } from '@/components/control-inactividad';
import { Spinner } from '@/components/ui';
import { useEmpresaActual, useSesion } from '@/hooks/queries';
import { useHidratado } from '@/hooks/use-hidratado';

interface NavItem {
  href: string;
  label: string;
  icon: typeof Users;
  soloAdmin?: boolean;
}

/** Menú principal. Para agregar una sección nueva, solo agregue una línea aquí. */
const NAV: { titulo: string; items: NavItem[] }[] = [
  {
    titulo: 'General',
    items: [{ href: '/', label: 'Inicio', icon: LayoutDashboard }],
  },
  {
    titulo: 'Personal',
    items: [
      { href: '/empleados', label: 'Empleados', icon: Users },
      { href: '/adelantos', label: 'Adelantos', icon: HandCoins },
      { href: '/prestamos', label: 'Préstamos', icon: Banknote },
    ],
  },
  {
    titulo: 'Pagos',
    items: [
      { href: '/periodos', label: 'Períodos y nóminas', icon: CalendarRange },
      { href: '/reportes', label: 'Reportes', icon: FileBarChart, soloAdmin: true },
    ],
  },
  {
    titulo: 'Administración',
    items: [
      { href: '/empresas', label: 'Empresas', icon: Building2, soloAdmin: true },
      { href: '/puestos', label: 'Puestos', icon: Briefcase },
      { href: '/catalogos', label: 'Conceptos de pago', icon: Settings2 },
      { href: '/usuarios', label: 'Usuarios', icon: ShieldCheck, soloAdmin: true },
    ],
  },
];

function esActivo(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  if (href === '/periodos') return pathname.startsWith('/periodos') || pathname.startsWith('/nominas');
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: ReactNode }) {
  const [abierto, setAbierto] = useState(false);

  return (
    <div className="min-h-screen lg:pl-64">
      {/* Barra superior (solo celular / tablet) */}
      <header className="no-print sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200 bg-white px-4 lg:hidden">
        <button
          onClick={() => setAbierto(true)}
          className="-ml-1 rounded-md p-1.5 text-slate-600 hover:bg-slate-100"
          aria-label="Abrir menú"
        >
          <Menu className="size-6" />
        </button>
        <Marca />
        <EmpresaEnBarra />
      </header>

      {/* Fondo oscuro detrás del menú en celular */}
      {abierto && <div className="fixed inset-0 z-40 bg-slate-900/50 lg:hidden" onClick={() => setAbierto(false)} />}

      {/* Menú lateral */}
      <aside
        className={clsx(
          'no-print fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-slate-900 text-slate-300 transition-transform lg:translate-x-0',
          abierto ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 items-center justify-between px-5">
          <Marca oscuro />
          <button
            onClick={() => setAbierto(false)}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-800 lg:hidden"
            aria-label="Cerrar menú"
          >
            <X className="size-5" />
          </button>
        </div>
        <SelectorEmpresa />
        {/* Al elegir una opción en el celular, el menú se cierra. */}
        <Suspense fallback={<Navegacion pathname={null} onNavegar={() => setAbierto(false)} />}>
          <NavegacionActiva onNavegar={() => setAbierto(false)} />
        </Suspense>
        <UsuarioActual />
      </aside>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <ContenidoCliente>{children}</ContenidoCliente>
      </main>
      <ControlInactividad />
    </div>
  );
}

/**
 * El contenido de las páginas internas se dibuja solo en el navegador: todos sus datos vienen de la API
 * con la sesión del usuario, así que dibujarlo en el servidor no aporta nada y causaría diferencias
 * de hidratación. El menú y el marco sí se dibujan en el servidor y aparecen al instante.
 */
function ContenidoCliente({ children }: { children: ReactNode }) {
  return useHidratado() ? children : <Spinner />;
}

function Marca({ oscuro }: { oscuro?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-500 text-sm font-bold text-white">N</span>
      <span className={clsx('font-semibold', oscuro ? 'text-white' : 'text-slate-900')}>Nómina</span>
    </Link>
  );
}

/**
 * Selector de empresa: lo que se muestra en todo el sistema (empleados, pagos, reportes…)
 * es de la empresa elegida, o de todas las que el usuario puede ver.
 */
function SelectorEmpresa() {
  const hidratado = useHidratado();
  const { seleccion, corregir, empresas, varias, cargando, cambiar } = useEmpresaActual();

  // Si la empresa recordada ya no está disponible (inactiva o sin acceso), se usa una válida.
  useEffect(() => {
    if (corregir !== null) cambiar(corregir);
  }, [corregir, cambiar]);

  if (!hidratado || cargando) return <div className="mx-3 h-[52px] rounded-lg bg-slate-800/60" />;
  return (
    <div className="mx-3 rounded-lg bg-slate-800/60 px-3 py-2">
      <label htmlFor="selector-empresa" className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
        <Building2 className="size-3.5" /> Empresa
      </label>
      {!empresas.length ? (
        <p className="mt-0.5 text-sm text-amber-300">Sin empresas asignadas</p>
      ) : !varias ? (
        <p className="mt-0.5 truncate text-sm font-medium text-white">{empresas[0].nombre}</p>
      ) : (
        <select
          id="selector-empresa"
          value={String(seleccion)}
          onChange={(e) => cambiar(e.target.value === 'todas' ? 'todas' : Number(e.target.value))}
          className="mt-0.5 w-full cursor-pointer truncate rounded-md border-0 bg-transparent py-0.5 pr-6 pl-0 text-sm font-medium text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none [&>option]:text-slate-900"
        >
          <option value="todas">Todas las empresas</option>
          {empresas.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nombre}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

/** En el celular, el nombre de la empresa elegida junto a la marca (se cambia desde el menú). */
function EmpresaEnBarra() {
  const hidratado = useHidratado();
  const { empresa, varias } = useEmpresaActual();
  if (!hidratado) return null;
  const texto = empresa?.nombre ?? (varias ? 'Todas las empresas' : '');
  return texto ? <span className="ml-auto truncate text-xs font-medium text-slate-500">{texto}</span> : null;
}

/** Lee la ruta actual para resaltar la opción del menú en la que está el usuario. */
function NavegacionActiva({ onNavegar }: { onNavegar: () => void }) {
  return <Navegacion pathname={usePathname()} onNavegar={onNavegar} />;
}

function Navegacion({ pathname, onNavegar }: { pathname: string | null; onNavegar: () => void }) {
  const { esAdmin } = useSesion();
  return (
    <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
      {NAV.map((grupo) => {
        const items = grupo.items.filter((i) => !i.soloAdmin || esAdmin);
        if (!items.length) return null;
        return (
          <div key={grupo.titulo}>
            <p className="px-3 text-xs font-semibold tracking-wider text-slate-500 uppercase">{grupo.titulo}</p>
            <ul className="mt-2 space-y-1">
              {items.map(({ href, label, icon: Icon }) => {
                const activo = pathname !== null && esActivo(pathname, href);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={onNavegar}
                      aria-current={activo ? 'page' : undefined}
                      className={clsx(
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                        activo ? 'bg-slate-800 text-white' : 'hover:bg-slate-800/60 hover:text-white',
                      )}
                    >
                      <Icon className={clsx('size-5', activo ? 'text-emerald-400' : 'text-slate-500')} />
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}

function UsuarioActual() {
  const { usuario } = useSesion();
  const [saliendo, setSaliendo] = useState(false);

  async function cerrarSesion() {
    setSaliendo(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.assign('/login');
  }

  return (
    <div className="border-t border-slate-800 p-3">
      {usuario && (
        <div className="px-3 py-2">
          <p className="truncate text-sm font-medium text-white">
            {usuario.nombre} {usuario.apellido}
          </p>
          <p className="truncate text-xs text-slate-400">
            {usuario.username} · {usuario.rol.nombre === 'ADMIN' ? 'Administrador' : 'Operador'}
          </p>
        </div>
      )}
      <Link
        href="/perfil"
        className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-slate-800/60 hover:text-white"
      >
        <KeyRound className="size-4 text-slate-500" /> Cambiar contraseña
      </Link>
      <button
        onClick={cerrarSesion}
        disabled={saliendo}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-slate-800/60 hover:text-white disabled:opacity-50"
      >
        <LogOut className="size-4 text-slate-500" /> {saliendo ? 'Saliendo…' : 'Cerrar sesión'}
      </button>
    </div>
  );
}
