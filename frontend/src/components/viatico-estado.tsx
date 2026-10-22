import { Badge } from '@/components/ui';
import type { EstadoViatico } from '@/lib/types';

const ESTADOS: Record<EstadoViatico, { texto: string; color: 'blue' | 'amber' | 'gray' }> = {
  PROGRAMADO: { texto: 'Programado', color: 'blue' },
  EN_VIAJE: { texto: 'En viaje', color: 'amber' },
  FINALIZADO: { texto: 'Finalizado', color: 'gray' },
};

/** Según las fechas del viático: aún no sale, está de viaje, o el viaje ya terminó. */
export function EstadoViaticoBadge({ estado }: { estado: EstadoViatico }) {
  const { texto, color } = ESTADOS[estado];
  return <Badge color={color}>{texto}</Badge>;
}
