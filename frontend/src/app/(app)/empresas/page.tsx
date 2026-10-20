'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Field,
  Input,
  Modal,
  ModalFooter,
  PageHeader,
  Spinner,
  Table,
  Td,
  Th,
} from '@/components/ui';
import { useEmpresas } from '@/hooks/queries';
import { api } from '@/lib/api';
import type { Empresa, EmpresaConConteo } from '@/lib/types';

/** Empresas del grupo (solo el administrador). Cada empleado y cada período pertenecen a una. */
export default function EmpresasPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, error, refetch } = useEmpresas();
  const [editar, setEditar] = useState<EmpresaConConteo | 'nueva' | null>(null);
  const [borrar, setBorrar] = useState<EmpresaConConteo | null>(null);

  const eliminar = useMutation({
    mutationFn: (id: number) => api.delete(`/empresas/${id}`),
    onSuccess: () => {
      toast.success('Empresa eliminada');
      queryClient.invalidateQueries({ queryKey: ['empresas'] });
    },
    onSettled: () => setBorrar(null),
  });

  return (
    <>
      <PageHeader
        title="Empresas"
        description="Las empresas del grupo. Elija arriba en el menú con cuál trabajar; los puestos y conceptos de pago son los mismos para todas."
        actions={
          <Button onClick={() => setEditar('nueva')}>
            <Plus className="size-4" /> Nueva empresa
          </Button>
        }
      />

      <Card>
        {isLoading ? (
          <Spinner />
        ) : error ? (
          <div className="p-4">
            <ErrorState error={error} onRetry={refetch} />
          </div>
        ) : !data?.length ? (
          <EmptyState
            title="Aún no hay empresas"
            description="Agregue las empresas del grupo para poder registrar empleados."
            action={
              <Button onClick={() => setEditar('nueva')}>
                <Plus className="size-4" /> Agregar la primera empresa
              </Button>
            }
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Empresa</Th>
                <Th>NIT</Th>
                <Th>Teléfono</Th>
                <Th className="text-right">Empleados activos</Th>
                <Th>Estado</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {data.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50">
                  <Td>
                    <div className="flex items-center gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                        <Building2 className="size-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900">{e.nombre}</p>
                        {e.direccion && <p className="truncate text-xs text-slate-500">{e.direccion}</p>}
                      </div>
                    </div>
                  </Td>
                  <Td className="text-slate-600">{e.nit ?? '—'}</Td>
                  <Td className="text-slate-600">{e.telefono ?? '—'}</Td>
                  <Td className="tabular text-right">{e.empleadosActivos}</Td>
                  <Td>{e.activo ? <Badge color="green">Activa</Badge> : <Badge>Inactiva</Badge>}</Td>
                  <Td className="text-right whitespace-nowrap">
                    <Button size="sm" variant="ghost" onClick={() => setEditar(e)} aria-label={`Editar ${e.nombre}`}>
                      <Pencil className="size-4" />
                    </Button>
                    {!e.empleadosActivos && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:bg-red-50"
                        onClick={() => setBorrar(e)}
                        aria-label={`Eliminar ${e.nombre}`}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
      <p className="mt-3 text-xs text-slate-500">
        Una empresa con empleados o pagos registrados no se puede eliminar; desactívela para que ya no aparezca en el selector. Su
        historial se conserva.
      </p>

      {editar && <EmpresaForm empresa={editar === 'nueva' ? undefined : editar} onClose={() => setEditar(null)} />}
      <ConfirmDialog
        open={!!borrar}
        onClose={() => setBorrar(null)}
        onConfirm={() => borrar && eliminar.mutate(borrar.id)}
        loading={eliminar.isPending}
        title="Eliminar empresa"
        confirmText="Eliminar"
        variant="danger"
      >
        <p>
          ¿Eliminar la empresa <strong>{borrar?.nombre}</strong>?
        </p>
      </ConfirmDialog>
    </>
  );
}

function EmpresaForm({ empresa, onClose }: { empresa?: Empresa; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [datos, setDatos] = useState({
    nombre: empresa?.nombre ?? '',
    nit: empresa?.nit ?? '',
    direccion: empresa?.direccion ?? '',
    telefono: empresa?.telefono ?? '',
    activo: empresa?.activo ?? true,
  });
  const campo = (clave: 'nombre' | 'nit' | 'direccion' | 'telefono') => ({
    value: datos[clave],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setDatos((d) => ({ ...d, [clave]: e.target.value })),
  });

  const guardar = useMutation({
    mutationFn: () => (empresa ? api.patch<Empresa>(`/empresas/${empresa.id}`, datos) : api.post<Empresa>('/empresas', datos)),
    onSuccess: (guardada) => {
      toast.success(empresa ? 'Empresa actualizada' : `Empresa "${guardada.nombre}" creada`);
      queryClient.invalidateQueries({ queryKey: ['empresas'] });
      onClose();
    },
  });

  return (
    <Modal open onClose={onClose} title={empresa ? 'Editar empresa' : 'Nueva empresa'}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          guardar.mutate();
        }}
      >
        <Field label="Nombre" hint="Ej.: Surtimateriales el Marfil">
          {(id) => <Input id={id} required minLength={2} maxLength={150} autoFocus {...campo('nombre')} />}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="NIT (opcional)">{(id) => <Input id={id} maxLength={20} {...campo('nit')} />}</Field>
          <Field label="Teléfono (opcional)">
            {(id) => <Input id={id} inputMode="tel" maxLength={20} {...campo('telefono')} />}
          </Field>
        </div>
        <Field label="Dirección (opcional)">{(id) => <Input id={id} maxLength={255} {...campo('direccion')} />}</Field>
        {empresa && (
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={datos.activo}
              onChange={(e) => setDatos((d) => ({ ...d, activo: e.target.checked }))}
              className="mt-0.5 size-4 accent-emerald-600"
            />
            <span>
              Activa
              <span className="block text-xs text-slate-500">
                Las empresas inactivas no aparecen en el selector ni reciben empleados nuevos.
              </span>
            </span>
          </label>
        )}
        <ModalFooter>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={guardar.isPending} disabled={datos.nombre.trim().length < 2}>
            {empresa ? 'Guardar cambios' : 'Crear empresa'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
