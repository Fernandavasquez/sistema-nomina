'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { PrestamoFormModal } from '@/components/forms/prestamo-form';
import { Button, Card, EmptyState, ErrorState, EstadoBadge, PageHeader, Select, Spinner, Table, Td, Th } from '@/components/ui';
import { api, qs } from '@/lib/api';
import { date, money, nombreCompleto } from '@/lib/format';
import type { Prestamo } from '@/lib/types';

export default function PrestamosPage() {
  const router = useRouter();
  const [estado, setEstado] = useState('ACTIVO');
  const [nuevo, setNuevo] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['prestamos', { estado }],
    queryFn: () => api.get<Prestamo[]>(`/prestamos${qs({ estado })}`),
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <PageHeader
        title="Préstamos"
        description="Se descuenta una cuota fija en cada pago hasta saldar el préstamo."
        actions={
          <Button onClick={() => setNuevo(true)}>
            <Plus className="size-4" /> Otorgar préstamo
          </Button>
        }
      />
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
          <Select value={estado} onChange={(e) => setEstado(e.target.value)} className="sm:w-56" aria-label="Estado">
            <option value="ACTIVO">Activos</option>
            <option value="PAGADO">Pagados</option>
            <option value="CANCELADO">Cancelados</option>
            <option value="">Todos</option>
          </Select>
          {data && data.length > 0 && estado === 'ACTIVO' && (
            <p className="text-sm text-slate-600">
              Saldo total:{' '}
              <span className="tabular font-semibold text-slate-900">
                {money(data.reduce((s, p) => s + p.saldoPendiente, 0))}
              </span>
            </p>
          )}
        </div>
        {isLoading ? (
          <Spinner />
        ) : error ? (
          <div className="p-4">
            <ErrorState error={error} onRetry={refetch} />
          </div>
        ) : !data?.length ? (
          <EmptyState title="No hay préstamos en esta lista" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Fecha</Th>
                <Th>Empleado</Th>
                <Th className="text-right">Préstamo</Th>
                <Th className="text-right">Cuota</Th>
                <Th className="text-right">Saldo</Th>
                <Th>Avance</Th>
                <Th>Estado</Th>
              </tr>
            </thead>
            <tbody>
              {data.map((p) => {
                const avance = Math.round(((p.montoTotal - p.saldoPendiente) / p.montoTotal) * 100);
                return (
                  <tr key={p.id} onClick={() => router.push(`/prestamos/${p.id}`)} className="cursor-pointer hover:bg-slate-50">
                    <Td className="whitespace-nowrap">{date(p.fechaSolicitud)}</Td>
                    <Td className="font-medium text-slate-900">{nombreCompleto(p.empleado)}</Td>
                    <Td className="tabular text-right">{money(p.montoTotal)}</Td>
                    <Td className="tabular text-right">{money(p.montoCuota)}</Td>
                    <Td className="tabular text-right font-medium">{money(p.saldoPendiente)}</Td>
                    <Td>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-200">
                          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${avance}%` }} />
                        </div>
                        <span className="tabular text-xs text-slate-500">{avance}%</span>
                      </div>
                    </Td>
                    <Td>
                      <EstadoBadge estado={p.estado} />
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>
      <PrestamoFormModal open={nuevo} onClose={() => setNuevo(false)} />
    </>
  );
}
