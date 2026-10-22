'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import { ViaticoFormModal } from '@/components/forms/viatico-form';
import { Button, Card, ConfirmDialog, EmptyState, ErrorState, Input, PageHeader, Spinner, Table, Td, Th } from '@/components/ui';
import { EstadoViaticoBadge } from '@/components/viatico-estado';
import { useEmpresaActual } from '@/hooks/queries';
import { useDebounce } from '@/hooks/use-debounce';
import { api, qs } from '@/lib/api';
import { date, money, nombreCompleto, today } from '@/lib/format';
import type { Viatico } from '@/lib/types';

/** Primer día del mes actual (filtro por defecto). */
const inicioDeMes = () => `${today().slice(0, 8)}01`;

export default function ViaticosPage() {
  const queryClient = useQueryClient();
  // Con "Todas las empresas" se indica la empresa de cada empleado.
  const { seleccion: empresaMenu, varias } = useEmpresaActual();
  const verEmpresa = varias && empresaMenu === 'todas';
  const [desde, setDesde] = useState(inicioDeMes);
  const [hasta, setHasta] = useState('');
  const [texto, setTexto] = useState('');
  const buscar = useDebounce(texto.trim(), 300);
  const [nuevo, setNuevo] = useState(false);
  const [editar, setEditar] = useState<Viatico | null>(null);
  const [borrar, setBorrar] = useState<Viatico | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['viaticos', { desde, hasta, buscar }],
    queryFn: () => api.get<Viatico[]>(`/viaticos${qs({ desde, hasta, buscar })}`),
    placeholderData: keepPreviousData,
  });

  const eliminar = useMutation({
    mutationFn: (id: number) => api.delete(`/viaticos/${id}`),
    onSuccess: () => {
      toast.success('Viático eliminado');
      queryClient.invalidateQueries({ queryKey: ['viaticos'] });
    },
    onSettled: () => setBorrar(null),
  });

  const total = data?.reduce((s, v) => s + v.monto, 0) ?? 0;

  return (
    <>
      <PageHeader
        title="Viáticos"
        description="Dinero entregado a los pilotos para los gastos de un viaje. Es solo registro: no cambia su pago."
        actions={
          <Button onClick={() => setNuevo(true)}>
            <Plus className="size-4" /> Registrar viático
          </Button>
        }
      />
      <Card>
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 p-4">
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-xs text-slate-500">
              Entregados desde
              <Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="mt-1 h-9 sm:w-40" />
            </label>
            <label className="text-xs text-slate-500">
              Hasta
              <Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="mt-1 h-9 sm:w-40" />
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder="Buscar destino o asunto"
                aria-label="Buscar destino o asunto"
                className="h-9 pl-9 sm:w-60"
              />
            </div>
          </div>
          {data && data.length > 0 && (
            <p className="text-sm text-slate-600">
              {data.length} viático(s) · Total: <span className="tabular font-semibold text-slate-900">{money(total)}</span>
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
          <EmptyState
            title="No hay viáticos en estas fechas"
            description="Para dar viáticos, el puesto del empleado debe estar marcado como «Recibe viáticos» en Puestos."
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Empleado</Th>
                <Th>Viático</Th>
                <Th>Fechas</Th>
                <Th className="text-right">Cantidad</Th>
                <Th>Estado</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {data.map((v) => (
                <tr key={v.id} className="hover:bg-slate-50">
                  <Td>
                    <Link href={`/empleados/${v.empleadoId}`} className="font-medium text-slate-900 hover:text-emerald-700">
                      {nombreCompleto(v.empleado)}
                    </Link>
                    {verEmpresa && <p className="text-xs text-slate-500">{v.empleado?.empresa.nombre}</p>}
                  </Td>
                  <Td className="max-w-xs">
                    <p className="font-medium text-slate-900">{v.destino}</p>
                    <p className="truncate text-xs text-slate-500" title={v.asunto}>
                      {v.asunto}
                    </p>
                  </Td>
                  <Td className="whitespace-nowrap text-slate-600">
                    {date(v.fechaEntrega)}
                    <span className="block text-xs text-slate-500">hasta {date(v.fechaHasta)}</span>
                  </Td>
                  <Td className="tabular text-right font-medium">{money(v.monto)}</Td>
                  <Td>
                    <EstadoViaticoBadge estado={v.estado} />
                  </Td>
                  <Td className="text-right whitespace-nowrap">
                    <Button size="sm" variant="ghost" onClick={() => setEditar(v)} aria-label="Editar viático">
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-600 hover:bg-red-50"
                      onClick={() => setBorrar(v)}
                      aria-label="Eliminar viático"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <ViaticoFormModal open={nuevo} onClose={() => setNuevo(false)} />
      <ViaticoFormModal open={!!editar} onClose={() => setEditar(null)} viatico={editar ?? undefined} />
      <ConfirmDialog
        open={!!borrar}
        onClose={() => setBorrar(null)}
        onConfirm={() => borrar && eliminar.mutate(borrar.id)}
        loading={eliminar.isPending}
        title="Eliminar viático"
        confirmText="Eliminar"
        variant="danger"
      >
        <p>
          ¿Eliminar el viático a <strong>{borrar?.destino}</strong> de {nombreCompleto(borrar?.empleado)} por{' '}
          {money(borrar?.monto ?? 0)}?
        </p>
      </ConfirmDialog>
    </>
  );
}
