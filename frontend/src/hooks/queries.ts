'use client';

import { useQuery } from '@tanstack/react-query';
import { useHidratado } from '@/hooks/use-hidratado';
import { api } from '@/lib/api';
import type { ConceptoNomina, FrecuenciaPago, Puesto, Usuario } from '@/lib/types';

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
