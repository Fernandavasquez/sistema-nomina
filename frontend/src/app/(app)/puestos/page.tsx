'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Briefcase, Pencil, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import { PuestoFormModal } from '@/components/forms/puesto-form';
import {
  Alert,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  PageHeader,
  Spinner,
  Table,
  Td,
  Th,
} from '@/components/ui';
import { usePuestos, useSesion } from '@/hooks/queries';
import { api } from '@/lib/api';
import type { Puesto } from '@/lib/types';

export default function PuestosPage() {
  const queryClient = useQueryClient();
  const { esAdmin } = useSesion();
  const { data, isLoading, error, refetch } = usePuestos();
  const [editar, setEditar] = useState<Puesto | 'nuevo' | null>(null);
  const [borrar, setBorrar] = useState<Puesto | null>(null);

  const eliminar = useMutation({
    mutationFn: (id: number) => api.delete(`/puestos/${id}`),
    onSuccess: () => {
      toast.success('Puesto eliminado');
      queryClient.invalidateQueries({ queryKey: ['puestos'] });
    },
    onSettled: () => setBorrar(null),
  });

  return (
    <>
      <PageHeader
        title="Puestos"
        description="Los cargos que existen en la empresa. Cada empleado se asigna a uno."
        actions={
          esAdmin && (
            <Button onClick={() => setEditar('nuevo')}>
              <Plus className="size-4" /> Nuevo puesto
            </Button>
          )
        }
      />
      {!esAdmin && (
        <div className="mb-6">
          <Alert color="blue">Solo un administrador puede agregar o modificar puestos.</Alert>
        </div>
      )}

      <Card>
        {isLoading ? (
          <Spinner />
        ) : error ? (
          <div className="p-4">
            <ErrorState error={error} onRetry={refetch} />
          </div>
        ) : !data?.length ? (
          <EmptyState
            title="Aún no hay puestos"
            description="Agregue los puestos de la empresa (por ejemplo: Piloto, Ayudante, Bodeguero) para poder registrar empleados."
            action={
              esAdmin && (
                <Button onClick={() => setEditar('nuevo')}>
                  <Plus className="size-4" /> Agregar el primer puesto
                </Button>
              )
            }
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Puesto</Th>
                <Th className="text-right">Empleados activos</Th>
                <Th>Estado</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {data.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <Td>
                    <div className="flex items-center gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                        <Briefcase className="size-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900">{p.nombre}</p>
                        {p.descripcion && <p className="truncate text-xs text-slate-500">{p.descripcion}</p>}
                      </div>
                    </div>
                  </Td>
                  <Td className="tabular text-right">
                    {p.empleadosActivos ? (
                      <Link href={`/empleados?puestoId=${p.id}`} className="font-medium text-emerald-700 hover:underline">
                        {p.empleadosActivos}
                      </Link>
                    ) : (
                      <span className="text-slate-400">0</span>
                    )}
                  </Td>
                  <Td>{p.activo ? <Badge color="green">Activo</Badge> : <Badge>Inactivo</Badge>}</Td>
                  <Td className="text-right whitespace-nowrap">
                    {esAdmin && (
                      <>
                        <Button size="sm" variant="ghost" onClick={() => setEditar(p)} aria-label={`Editar ${p.nombre}`}>
                          <Pencil className="size-4" />
                        </Button>
                        {!p.empleadosTotal && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:bg-red-50"
                            onClick={() => setBorrar(p)}
                            aria-label={`Eliminar ${p.nombre}`}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        )}
                      </>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
      {esAdmin && data && data.some((p) => p.empleadosTotal) && (
        <p className="mt-3 text-xs text-slate-500">
          Un puesto con empleados no se puede eliminar; desactívelo para que ya no aparezca al registrar empleados nuevos.
        </p>
      )}

      <PuestoFormModal
        open={!!editar}
        onClose={() => setEditar(null)}
        puesto={editar === 'nuevo' ? undefined : (editar ?? undefined)}
      />
      <ConfirmDialog
        open={!!borrar}
        onClose={() => setBorrar(null)}
        onConfirm={() => borrar && eliminar.mutate(borrar.id)}
        loading={eliminar.isPending}
        title="Eliminar puesto"
        confirmText="Eliminar"
        variant="danger"
      >
        <p>
          ¿Eliminar el puesto <strong>{borrar?.nombre}</strong>?
        </p>
      </ConfirmDialog>
    </>
  );
}
