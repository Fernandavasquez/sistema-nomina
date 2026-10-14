'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button, Field, Input, Modal, ModalFooter, Select, Textarea } from '@/components/ui';
import { api, qs } from '@/lib/api';
import { money, nombreCompleto, today } from '@/lib/format';
import type { Adelanto, Empleado } from '@/lib/types';

const schema = z.object({
  empleadoId: z.number({ error: 'Seleccione un empleado' }).int().positive('Seleccione un empleado'),
  monto: z.number({ error: 'Ingrese el monto' }).positive('El monto debe ser mayor a 0'),
  fechaSolicitud: z.string().min(1, 'Ingrese la fecha'),
  observacion: z.string().max(500).optional(),
});
type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  empleado?: Empleado;
  adelanto?: Adelanto;
}

/**
 * Modal para registrar o editar un adelanto. Si se pasa `empleado`, no se muestra el selector.
 * El formulario solo existe mientras el modal está abierto: así cada apertura empieza limpia.
 */
export function AdelantoFormModal(props: Props) {
  return props.open ? <AdelantoForm {...props} /> : null;
}

function AdelantoForm({ open, onClose, empleado, adelanto }: Props) {
  const queryClient = useQueryClient();
  const editando = !!adelanto;

  const empleados = useQuery({
    queryKey: ['empleados', { estado: 'ACTIVO' }],
    queryFn: () => api.get<Empleado[]>(`/empleados${qs({ estado: 'ACTIVO' })}`),
    enabled: open && !empleado && !editando,
  });

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    values: {
      empleadoId: adelanto?.empleadoId ?? empleado?.id ?? 0,
      monto: adelanto?.monto ?? (undefined as unknown as number),
      fechaSolicitud: adelanto?.fechaSolicitud ?? today(),
      observacion: adelanto?.observacion ?? '',
    },
  });

  const seleccionado = empleado ?? adelanto?.empleado ?? empleados.data?.find((e) => e.id === watch('empleadoId'));

  const guardar = useMutation({
    mutationFn: (data: FormData) =>
      editando
        ? api.patch<Adelanto>(`/adelantos/${adelanto.id}`, {
            monto: data.monto,
            fechaSolicitud: data.fechaSolicitud,
            observacion: data.observacion,
          })
        : api.post<Adelanto>('/adelantos', data),
    onSuccess: () => {
      toast.success(editando ? 'Adelanto actualizado' : 'Adelanto registrado');
      queryClient.invalidateQueries({ queryKey: ['adelantos'] });
      queryClient.invalidateQueries({ queryKey: ['empleado'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      reset();
      onClose();
    },
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editando ? 'Editar adelanto' : 'Registrar adelanto'}
      description="Se descontará completo en el siguiente pago del empleado."
    >
      <form onSubmit={handleSubmit((d) => guardar.mutate(d))} className="space-y-4" noValidate>
        {empleado || editando ? (
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
            Empleado: <strong>{nombreCompleto(seleccionado)}</strong>
          </p>
        ) : (
          <Field label="Empleado" error={errors.empleadoId?.message}>
            {(id) => (
              <Select id={id} invalid={!!errors.empleadoId} {...register('empleadoId', { valueAsNumber: true })}>
                <option value={0}>{empleados.isLoading ? 'Cargando…' : 'Seleccione…'}</option>
                {empleados.data?.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.apellidos}, {e.nombres}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Monto (Q)"
            error={errors.monto?.message}
            hint={seleccionado ? `Salario por pago: ${money(seleccionado.salarioBase)}` : undefined}
          >
            {(id) => (
              <Input
                id={id}
                type="number"
                step="0.01"
                min="0"
                invalid={!!errors.monto}
                {...register('monto', { valueAsNumber: true })}
              />
            )}
          </Field>
          <Field label="Fecha" error={errors.fechaSolicitud?.message}>
            {(id) => <Input id={id} type="date" invalid={!!errors.fechaSolicitud} {...register('fechaSolicitud')} />}
          </Field>
        </div>
        <Field label="Observación (opcional)">{(id) => <Textarea id={id} {...register('observacion')} />}</Field>
        <ModalFooter>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={guardar.isPending}>
            {editando ? 'Guardar cambios' : 'Registrar adelanto'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
