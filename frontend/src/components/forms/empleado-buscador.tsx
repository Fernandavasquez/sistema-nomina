'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { Loader2, Search, X } from 'lucide-react';
import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { useDebounce } from '@/hooks/use-debounce';
import { api, qs } from '@/lib/api';
import { dpi, money } from '@/lib/format';
import type { Empleado } from '@/lib/types';
import { salarioPorPago } from '@/lib/salario';

const MAX_RESULTADOS = 8;

/**
 * Buscador de empleados activos para formularios (adelantos, préstamos...).
 * Busca por nombre, apellido o DPI mientras se escribe; se elige con clic o con las flechas + Enter.
 */
export function EmpleadoBuscador({
  id,
  value,
  onChange,
  invalid,
  filtro,
}: {
  id: string;
  value: Empleado | null;
  onChange: (empleado: Empleado | null) => void;
  invalid?: boolean;
  /** Solo muestra los empleados que cumplen esta condición (ej. puestos que reciben viáticos). */
  filtro?: (empleado: Empleado) => boolean;
}) {
  const listaId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [texto, setTexto] = useState('');
  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState(0);
  const buscar = useDebounce(texto.trim(), 250);

  const { data, isFetching } = useQuery({
    queryKey: ['empleados', 'buscador', buscar],
    queryFn: () => api.get<Empleado[]>(`/empleados${qs({ estado: 'ACTIVO', buscar })}`),
    enabled: abierto && !value,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
  const resultados = (filtro ? data?.filter(filtro) : data)?.slice(0, MAX_RESULTADOS) ?? [];
  const restantes = (data?.length ?? 0) - resultados.length;

  function elegir(empleado: Empleado) {
    onChange(empleado);
    setTexto('');
    setAbierto(false);
  }

  function cambiar() {
    onChange(null);
    setAbierto(true);
    // Espera a que el campo de búsqueda vuelva a aparecer para enfocarlo.
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setAbierto(true);
      setActivo((i) => Math.min(i + 1, resultados.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActivo((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      // Enter elige el empleado resaltado en lugar de enviar el formulario.
      e.preventDefault();
      if (abierto && resultados[activo]) elegir(resultados[activo]);
    } else if (e.key === 'Escape' && abierto) {
      e.stopPropagation(); // cierra la lista, no el modal
      setAbierto(false);
    }
  }

  // ───── Empleado ya elegido ─────
  if (value) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-emerald-300 bg-emerald-50/60 px-3 py-2.5">
        <Iniciales empleado={value} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-900">
            {value.nombres} {value.apellidos}
          </p>
          <p className="truncate text-xs text-slate-500">
            DPI {dpi(value.dpi)} · {value.puesto.nombre} · {value.frecuenciaPago.nombre}
          </p>
        </div>
        <button
          type="button"
          onClick={cambiar}
          className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
        >
          Cambiar
        </button>
      </div>
    );
  }

  // ───── Búsqueda ─────
  return (
    <div>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
        <input
          ref={inputRef}
          id={id}
          role="combobox"
          aria-expanded={abierto}
          aria-controls={listaId}
          aria-autocomplete="list"
          aria-activedescendant={abierto && resultados[activo] ? `${listaId}-${resultados[activo].id}` : undefined}
          aria-invalid={invalid || undefined}
          autoComplete="off"
          placeholder="Escriba nombre, apellido o DPI…"
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value);
            setActivo(0);
            setAbierto(true);
          }}
          onFocus={() => setAbierto(true)}
          onKeyDown={onKeyDown}
          className={clsx(
            'block h-10 w-full rounded-lg border bg-white pr-9 pl-9 text-sm text-slate-900 shadow-xs placeholder:text-slate-400',
            'focus:ring-2 focus:outline-none',
            invalid
              ? 'border-red-400 focus:ring-red-500/20'
              : 'border-slate-300 focus:border-emerald-500 focus:ring-emerald-500/20',
          )}
        />
        {isFetching ? (
          <Loader2 className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-slate-400" />
        ) : (
          texto && (
            <button
              type="button"
              onClick={() => {
                setTexto('');
                inputRef.current?.focus();
              }}
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600"
              aria-label="Borrar búsqueda"
            >
              <X className="size-4" />
            </button>
          )
        )}
      </div>

      {/* La lista va dentro del flujo del formulario (no flotante) para que nunca quede cortada en el modal. */}
      {abierto && (
        <div className="mt-1.5 overflow-hidden rounded-lg border border-slate-200 bg-white">
          {!data ? (
            <p className="px-3 py-3 text-sm text-slate-500">Buscando…</p>
          ) : resultados.length === 0 ? (
            <p className="px-3 py-3 text-sm text-slate-500">
              No se encontró ningún empleado activo{buscar ? ` con «${buscar}»` : ''}.
            </p>
          ) : (
            <ul id={listaId} role="listbox" className="max-h-64 divide-y divide-slate-100 overflow-y-auto">
              {resultados.map((e, i) => (
                <li
                  key={e.id}
                  id={`${listaId}-${e.id}`}
                  role="option"
                  aria-selected={i === activo}
                  onMouseDown={(ev) => ev.preventDefault()} // mantiene el foco en el campo
                  onMouseEnter={() => setActivo(i)}
                  onClick={() => elegir(e)}
                  className={clsx('flex cursor-pointer items-center gap-3 px-3 py-2', i === activo && 'bg-emerald-50')}
                >
                  <Iniciales empleado={e} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {e.apellidos}, {e.nombres}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      DPI {dpi(e.dpi)} · {e.puesto.nombre}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="tabular text-xs font-medium text-slate-700">
                      {money(salarioPorPago(e.salarioMensual, e.frecuenciaPago))}
                    </p>
                    <p className="text-xs text-slate-400">por pago {e.frecuenciaPago.nombre.toLowerCase()}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {restantes > 0 && (
            <p className="border-t border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-500">
              y {restantes} más… siga escribiendo para afinar la búsqueda.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Iniciales({ empleado }: { empleado: Empleado }) {
  const iniciales = `${empleado.nombres[0] ?? ''}${empleado.apellidos[0] ?? ''}`.toUpperCase();
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-600">
      {iniciales}
    </span>
  );
}
