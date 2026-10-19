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
import type { Empleado, Prestamo } from '@/lib/types';
import { salarioPorPago } from '@/lib/salario';

const schema = z
  .object({
    empleadoId: z.number({ error: 'Seleccione un empleado' }).int().positive('Seleccione un empleado'),
    montoTotal: z.number({ error: 'Ingrese el monto' }).positive('Debe ser mayor a 0'),
    montoCuota: z.number({ error: 'Ingrese la cuota' }).positive('Debe ser mayor a 0'),
    fechaSolicitud: z.string().min(1, 'Ingrese la fecha'),
    observacion: z.string().max(500).optional(),
  })
  .refine((d) => d.montoCuota <= d.montoTotal, { path: ['montoCuota'], message: 'La cuota no puede ser mayor al préstamo' });
type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  empleado?: Empleado;
}

/** El formulario solo existe mientras el modal está abierto: así cada apertura empieza limpia. */
export function PrestamoFormModal(props: Props) {
  return props.open ? <PrestamoForm {...props} /> : null;
}

function PrestamoForm({ open, onClose, empleado }: Props) {
  const queryClient = useQueryClient();
  // Empleado elegido en el buscador (cuando no viene fijo desde la ficha del empleado).
  const [elegido, setElegido] = useState<Empleado | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      empleadoId: empleado?.id ?? 0,
      montoTotal: undefined as unknown as number,
      montoCuota: undefined as unknown as number,
      fechaSolicitud: today(),
      observacion: '',
    },
  });

  const seleccionado = empleado ?? elegido;
  const total = watch('montoTotal');
  const cuota = watch('montoCuota');
  const pagos = total > 0 && cuota > 0 ? Math.ceil(total / cuota) : null;
  const unidad = seleccionado?.frecuenciaPago.codigo === 'QUINCENAL' ? 'quincenas' : 'semanas';

  const guardar = useMutation({
    mutationFn: (data: FormData) => api.post<Prestamo>('/prestamos', data),
    onSuccess: () => {
      toast.success('Préstamo registrado');
      queryClient.invalidateQueries({ queryKey: ['prestamos'] });
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
      title="Otorgar préstamo"
      description="La cuota se descuenta automáticamente en cada pago hasta saldarlo."
    >
      <form onSubmit={handleSubmit((d) => guardar.mutate(d))} className="space-y-4" noValidate>
        {empleado ? (
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
            Empleado: <strong>{nombreCompleto(empleado)}</strong>
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
          <Field label="Monto del préstamo (Q)" error={errors.montoTotal?.message}>
            {(id) => (
              <Input
                id={id}
                type="number"
                step="0.01"
                min="0"
                invalid={!!errors.montoTotal}
                {...register('montoTotal', { valueAsNumber: true })}
              />
            )}
          </Field>
          <Field
            label="Cuota por pago (Q)"
            error={errors.montoCuota?.message}
            hint={
              seleccionado
                ? `Pago ${seleccionado.frecuenciaPago.nombre.toLowerCase()}: ${money(salarioPorPago(seleccionado.salarioMensual, seleccionado.frecuenciaPago))}`
                : undefined
            }
          >
            {(id) => (
              <Input
                id={id}
                type="number"
                step="0.01"
                min="0"
                invalid={!!errors.montoCuota}
                {...register('montoCuota', { valueAsNumber: true })}
              />
            )}
          </Field>
        </div>
        {pagos && (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            Se pagará en <strong>{pagos}</strong> {seleccionado ? unidad : 'pagos'}.
          </p>
        )}
        <Field label="Fecha" error={errors.fechaSolicitud?.message}>
          {(id) => <Input id={id} type="date" invalid={!!errors.fechaSolicitud} {...register('fechaSolicitud')} />}
        </Field>
        <Field label="Observación (opcional)">{(id) => <Textarea id={id} {...register('observacion')} />}</Field>
        <ModalFooter>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={guardar.isPending}>
            Otorgar préstamo
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
