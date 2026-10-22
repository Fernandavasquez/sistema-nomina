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
import { nombreCompleto, today } from '@/lib/format';
import type { Empleado, Viatico } from '@/lib/types';

const schema = z
  .object({
    empleadoId: z.number({ error: 'Seleccione un empleado' }).int().positive('Seleccione un empleado'),
    destino: z.string().trim().min(2, 'Ingrese el destino').max(150),
    asunto: z.string().trim().min(3, 'Ingrese el asunto').max(500),
    fechaEntrega: z.string().min(1, 'Ingrese la fecha'),
    fechaHasta: z.string().min(1, 'Ingrese hasta qué día'),
    monto: z.number({ error: 'Ingrese la cantidad' }).positive('La cantidad debe ser mayor a 0'),
  })
  .refine((d) => !d.fechaHasta || !d.fechaEntrega || d.fechaHasta >= d.fechaEntrega, {
    path: ['fechaHasta'],
    message: 'No puede ser antes de la fecha en que se dio',
  });
type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  /** Si se pasa, el viático es para este empleado (desde su ficha) y no se muestra el buscador. */
  empleado?: Empleado;
  viatico?: Viatico;
}

/** Solo los empleados cuyo puesto recibe viáticos (por ejemplo, pilotos). */
const recibeViaticos = (e: Empleado) => e.puesto.recibeViaticos;

export function ViaticoFormModal(props: Props) {
  return props.open ? <ViaticoForm {...props} /> : null;
}

function ViaticoForm({ open, onClose, empleado, viatico }: Props) {
  const queryClient = useQueryClient();
  const editando = !!viatico;
  const [elegido, setElegido] = useState<Empleado | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      empleadoId: viatico?.empleadoId ?? empleado?.id ?? 0,
      destino: viatico?.destino ?? '',
      asunto: viatico?.asunto ?? '',
      fechaEntrega: viatico?.fechaEntrega ?? today(),
      fechaHasta: viatico?.fechaHasta ?? today(),
      monto: viatico?.monto ?? (undefined as unknown as number),
    },
  });

  const seleccionado = empleado ?? viatico?.empleado ?? elegido;

  const guardar = useMutation({
    mutationFn: ({ empleadoId, ...datos }: FormData) =>
      editando ? api.patch<Viatico>(`/viaticos/${viatico.id}`, datos) : api.post<Viatico>('/viaticos', { empleadoId, ...datos }),
    onSuccess: () => {
      toast.success(editando ? 'Viático actualizado' : 'Viático registrado');
      queryClient.invalidateQueries({ queryKey: ['viaticos'] });
      onClose();
    },
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editando ? 'Editar viático' : 'Registrar viático'}
      description="Dinero para los gastos del viaje. Es solo registro: no cambia el pago del empleado."
    >
      <form onSubmit={handleSubmit((d) => guardar.mutate(d))} className="space-y-4" noValidate>
        {empleado || editando ? (
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
            Empleado: <strong>{nombreCompleto(seleccionado)}</strong>
          </p>
        ) : (
          <Field
            label="Empleado"
            error={errors.empleadoId?.message}
            hint="Solo aparecen los empleados cuyo puesto recibe viáticos (se marca en Puestos)"
          >
            {(id) => (
              <EmpleadoBuscador
                id={id}
                value={elegido}
                invalid={!!errors.empleadoId}
                filtro={recibeViaticos}
                onChange={(e) => {
                  setElegido(e);
                  setValue('empleadoId', e?.id ?? 0, { shouldValidate: !!e });
                }}
              />
            )}
          </Field>
        )}
        <Field label="Viático (destino)" error={errors.destino?.message} hint="Ej.: Quetzaltenango">
          {(id) => <Input id={id} invalid={!!errors.destino} {...register('destino')} />}
        </Field>
        <Field label="Asunto" error={errors.asunto?.message} hint="Motivo del viaje">
          {(id) => <Textarea id={id} rows={2} invalid={!!errors.asunto} {...register('asunto')} />}
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Fecha en que se dio" error={errors.fechaEntrega?.message}>
            {(id) => <Input id={id} type="date" invalid={!!errors.fechaEntrega} {...register('fechaEntrega')} />}
          </Field>
          <Field label="Hasta el día" error={errors.fechaHasta?.message}>
            {(id) => <Input id={id} type="date" invalid={!!errors.fechaHasta} {...register('fechaHasta')} />}
          </Field>
          <Field label="Cantidad (Q)" error={errors.monto?.message}>
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
        </div>
        <ModalFooter>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={guardar.isPending}>
            {editando ? 'Guardar cambios' : 'Registrar viático'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
