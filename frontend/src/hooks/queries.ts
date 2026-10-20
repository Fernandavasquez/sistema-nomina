'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useSyncExternalStore } from 'react';
import { useHidratado } from '@/hooks/use-hidratado';
import { api } from '@/lib/api';
import { guardarEmpresaActual, leerEmpresaActual, type SeleccionEmpresa, suscribirEmpresaActual } from '@/lib/empresa-actual';
import type { ConceptoNomina, EmpresaConConteo, FrecuenciaPago, Puesto, Usuario } from '@/lib/types';

/** Usuario que inició sesión (con su rol). */
export function useSesion() {
  const query = useQuery({
    queryKey: ['perfil'],
    queryFn: () => api.get<Usuario>('/auth/perfil'),
    staleTime: 5 * 60_000,
  });
  // Hasta hidratar se responde "sin usuario", igual que en el servidor (evita diferencias de hidratación).
  const usuario = useHidratado() ? query.data : undefined;
  return { ...query, usuario, esAdmin: usuario?.rol.nombre === 'ADMIN' };
}

// Catálogos: cambian poco, así que se guardan en caché por más tiempo.

export function usePuestos() {
  return useQuery({ queryKey: ['puestos'], queryFn: () => api.get<Puesto[]>('/puestos'), staleTime: 5 * 60_000 });
}

export function useFrecuencias() {
  return useQuery({
    queryKey: ['frecuencias'],
    queryFn: () => api.get<FrecuenciaPago[]>('/frecuencias-pago'),
    staleTime: 30 * 60_000,
  });
}

export function useConceptos() {
  return useQuery({
    queryKey: ['conceptos'],
    queryFn: () => api.get<ConceptoNomina[]>('/conceptos-nomina'),
    staleTime: 5 * 60_000,
  });
}

// ───── Empresas ─────

/** Empresas que el usuario puede ver (el administrador, todas), con sus empleados activos. */
export function useEmpresas() {
  return useQuery({
    queryKey: ['empresas'],
    queryFn: () => api.get<EmpresaConConteo[]>('/empresas'),
    staleTime: 5 * 60_000,
  });
}

/**
 * Empresa elegida en el selector del menú.
 * - `seleccion`: el id de la empresa, o 'todas'.
 * - Si el usuario tiene una sola empresa, siempre es esa.
 * - `cambiar` guarda la elección y vuelve a cargar los datos de la pantalla.
 */
export function useEmpresaActual() {
  const queryClient = useQueryClient();
  const guardada = useSyncExternalStore(suscribirEmpresaActual, leerEmpresaActual, () => 'todas' as const);
  const { data, isLoading } = useEmpresas();
  const empresas = data?.filter((e) => e.activo) ?? [];

  let seleccion: SeleccionEmpresa = guardada;
  if (data) {
    if (seleccion !== 'todas' && !empresas.some((e) => e.id === seleccion)) seleccion = 'todas';
    if (seleccion === 'todas' && empresas.length === 1) seleccion = empresas[0].id;
  }

  const cambiar = useCallback(
    (valor: SeleccionEmpresa) => {
      if (valor === leerEmpresaActual()) return;
      guardarEmpresaActual(valor);
      // Todo lo que se muestra depende de la empresa: se vuelve a pedir.
      queryClient.resetQueries({ predicate: (q) => q.queryKey[0] !== 'empresas' && q.queryKey[0] !== 'perfil' });
    },
    [queryClient],
  );

  return {
    seleccion,
    /** La que se debe guardar si la recordada ya no es válida. */
    corregir: data && seleccion !== guardada ? seleccion : null,
    empresa: seleccion === 'todas' ? null : (empresas.find((e) => e.id === seleccion) ?? null),
    empresas,
    varias: empresas.length > 1,
    cargando: isLoading,
    cambiar,
  };
}
