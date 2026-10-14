'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import { AdelantoFormModal } from '@/components/forms/adelanto-form';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  PageHeader,
  Select,
  Spinner,
  Table,
  Td,
  Th,
} from '@/components/ui';
import { api, qs } from '@/lib/api';
import { date, money, nombreCompleto } from '@/lib/format';
import type { Adelanto } from '@/lib/types';

export default function AdelantosPage() {
  const queryClient = useQueryClient();
  const [aplicado, setAplicado] = useState('false');
  const [nuevo, setNuevo] = useState(false);
  const [editar, setEditar] = useState<Adelanto | null>(null);
  const [borrar, setBorrar] = useState<Adelanto | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['adelantos', { aplicado }],
    queryFn: () => api.get<Adelanto[]>(`/adelantos${qs({ aplicado })}`),
    placeholderData: keepPreviousData,
  });

  const eliminar = useMutation({
    mutationFn: (id: number) => api.delete(`/adelantos/${id}`),
    onSuccess: () => {
      toast.success('Adelanto eliminado');
      queryClient.invalidateQueries({ queryKey: ['adelantos'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onSettled: () => setBorrar(null),
  });

  const total = data?.reduce((s, a) => s + a.monto, 0) ?? 0;

  return (
    <>
      <PageHeader
        title="Adelantos"
        description="Dinero entregado antes del día de pago. Se descuenta completo en el siguiente pago."
        actions={
          <Button onClick={() => setNuevo(true)}>
            <Plus className="size-4" /> Registrar adelanto
          </Button>
        }
      />
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
          <Select value={aplicado} onChange={(e) => setAplicado(e.target.value)} className="sm:w-56" aria-label="Filtro">
            <option value="false">Pendientes de descontar</option>
            <option value="true">Ya descontados</option>
            <option value="">Todos</option>
          </Select>
          {data && data.length > 0 && (
            <p className="text-sm text-slate-600">
              Total: <span className="tabular font-semibold text-slate-900">{money(total)}</span>
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
          <EmptyState title="No hay adelantos en esta lista" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Fecha</Th>
                <Th>Empleado</Th>
                <Th>Observación</Th>
                <Th className="text-right">Monto</Th>
                <Th>Estado</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {data.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50">
                  <Td className="whitespace-nowrap">{date(a.fechaSolicitud)}</Td>
                  <Td>
                    <Link href={`/empleados/${a.empleadoId}`} className="font-medium text-slate-900 hover:text-emerald-700">
                      {nombreCompleto(a.empleado)}
                    </Link>
                  </Td>
                  <Td className="max-w-xs truncate text-slate-600">{a.observacion ?? '—'}</Td>
                  <Td className="tabular text-right font-medium">{money(a.monto)}</Td>
                  <Td>{a.aplicado ? <Badge color="green">Descontado</Badge> : <Badge color="amber">Pendiente</Badge>}</Td>
                  <Td className="text-right whitespace-nowrap">
                    {!a.aplicado && (
                      <>
                        <Button size="sm" variant="ghost" onClick={() => setEditar(a)} aria-label="Editar">
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:bg-red-50"
                          onClick={() => setBorrar(a)}
                          aria-label="Eliminar"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <AdelantoFormModal open={nuevo} onClose={() => setNuevo(false)} />
      <AdelantoFormModal open={!!editar} onClose={() => setEditar(null)} adelanto={editar ?? undefined} />
      <ConfirmDialog
        open={!!borrar}
        onClose={() => setBorrar(null)}
        onConfirm={() => borrar && eliminar.mutate(borrar.id)}
        loading={eliminar.isPending}
        title="Eliminar adelanto"
        confirmText="Eliminar"
        variant="danger"
      >
        <p>
          ¿Eliminar el adelanto de <strong>{money(borrar?.monto)}</strong> de <strong>{nombreCompleto(borrar?.empleado)}</strong>?
        </p>
      </ConfirmDialog>
    </>
  );
}
