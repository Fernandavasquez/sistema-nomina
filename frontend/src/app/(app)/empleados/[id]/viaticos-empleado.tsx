'use client';

import { useQuery } from '@tanstack/react-query';
import { MapPin } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { ViaticoFormModal } from '@/components/forms/viatico-form';
import { Button, Card, CardHeader, EmptyState, ErrorState, Spinner, Table, Td, Th } from '@/components/ui';
import { EstadoViaticoBadge } from '@/components/viatico-estado';
import { api, qs } from '@/lib/api';
import { date, money } from '@/lib/format';
import type { Empleado, Viatico } from '@/lib/types';

const MOSTRAR = 5;

/** Últimos viáticos del empleado (solo se muestra si su puesto recibe viáticos). */
export function ViaticosEmpleado({ empleado }: { empleado: Empleado }) {
  const [nuevo, setNuevo] = useState(false);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['viaticos', { empleadoId: empleado.id }],
    queryFn: () => api.get<Viatico[]>(`/viaticos${qs({ empleadoId: empleado.id })}`),
  });
  const total = data?.reduce((s, v) => s + v.monto, 0) ?? 0;

  return (
    <Card>
      <CardHeader
        title="Viáticos"
        description={data?.length ? `${data.length} en total · ${money(total)}` : 'Dinero para gastos de viaje'}
        actions={
          empleado.estado === 'ACTIVO' && (
            <Button size="sm" variant="secondary" onClick={() => setNuevo(true)}>
              <MapPin className="size-4" /> Registrar
            </Button>
          )
        }
      />
      {isLoading ? (
        <Spinner />
      ) : error ? (
        <div className="p-4">
          <ErrorState error={error} onRetry={refetch} />
        </div>
      ) : !data?.length ? (
        <EmptyState title="Sin viáticos registrados" />
      ) : (
        <>
          <Table>
            <thead>
              <tr>
                <Th>Viático</Th>
                <Th>Fechas</Th>
                <Th className="text-right">Cantidad</Th>
                <Th>Estado</Th>
              </tr>
            </thead>
            <tbody>
              {data.slice(0, MOSTRAR).map((v) => (
                <tr key={v.id}>
                  <Td className="max-w-56">
                    <p className="font-medium text-slate-900">{v.destino}</p>
                    <p className="truncate text-xs text-slate-500" title={v.asunto}>
                      {v.asunto}
                    </p>
                  </Td>
                  <Td className="whitespace-nowrap text-slate-600">
                    {date(v.fechaEntrega)} – {date(v.fechaHasta)}
                  </Td>
                  <Td className="tabular text-right font-medium">{money(v.monto)}</Td>
                  <Td>
                    <EstadoViaticoBadge estado={v.estado} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
          {data.length > MOSTRAR && (
            <p className="border-t border-slate-100 px-5 py-3 text-sm">
              <Link href="/viaticos" className="font-medium text-emerald-700 hover:underline">
                Ver todos los viáticos
              </Link>
            </p>
          )}
        </>
      )}
      <ViaticoFormModal open={nuevo} onClose={() => setNuevo(false)} empleado={empleado} />
    </Card>
  );
}
