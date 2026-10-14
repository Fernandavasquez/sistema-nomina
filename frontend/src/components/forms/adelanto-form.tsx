'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { EmpleadoBuscador } from '@/components/forms/empleado-buscador';
import { Button, Field, Input, Modal, ModalFooter, Textarea } from '@/components/ui';
import { api } from '@/lib/api';
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

  // Empleado elegido en el buscador (cuando no viene fijo desde la ficha del empleado).
  const [elegido, setElegido] = useState<Empleado | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      empleadoId: adelanto?.empleadoId ?? empleado?.id ?? 0,
      monto: adelanto?.monto ?? (undefined as unknown as number),
      fechaSolicitud: adelanto?.fechaSolicitud ?? today(),
      observacion: adelanto?.observacion ?? '',
    },
  });

  const seleccionado = empleado ?? adelanto?.empleado ?? elegido;

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
              <EmpleadoBuscador
                id={id}
                value={elegido}
                invalid={!!errors.empleadoId}
                onChange={(e) => {
                  setElegido(e);
                  setValue('empleadoId', e?.id ?? 0, { shouldValidate: !!e });
                }}
              />
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
