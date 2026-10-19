'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { PuestoFormModal } from '@/components/forms/puesto-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button, ButtonLink, Card, CardHeader, Field, Input, Select, Textarea } from '@/components/ui';
import { useFrecuencias, usePuestos, useSesion } from '@/hooks/queries';
import { api } from '@/lib/api';
import { today } from '@/lib/format';
import type { Empleado } from '@/lib/types';

// Las mismas reglas que valida el backend, para avisar antes de enviar.
const schema = z.object({
  nombres: z.string().trim().min(2, 'Mínimo 2 letras').max(100),
  apellidos: z.string().trim().min(2, 'Mínimo 2 letras').max(100),
  dpi: z
    .string()
    .transform((v) => v.replace(/[\s-]/g, ''))
    .pipe(z.string().regex(/^\d{13}$/, 'El DPI debe tener 13 dígitos')),
  telefono: z
    .string()
    .trim()
    .regex(/^$|^[\d\s+()-]{8,20}$/, 'Teléfono inválido'),
  email: z.union([z.literal(''), z.email('Correo inválido')]),
  direccion: z.string().max(255),
  fechaIngreso: z.string().min(1, 'Ingrese la fecha de ingreso'),
  puestoId: z.number().int().positive('Seleccione un puesto'),
  frecuenciaPagoId: z.number().int().positive('Seleccione la forma de pago'),
  salarioBase: z.number({ error: 'Ingrese el salario' }).positive('El salario debe ser mayor a 0'),
  bancoDestino: z.string().max(100),
  numeroCuenta: z
    .string()
    .trim()
    .regex(/^$|^[\d-]{4,30}$/, 'Solo números y guiones'),
});
type FormInput = z.input<typeof schema>;
type FormOutput = z.output<typeof schema>;

export function EmpleadoForm({ empleado }: { empleado?: Empleado }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const puestos = usePuestos();
  const frecuencias = useFrecuencias();
  const { esAdmin } = useSesion();
  const [nuevoPuesto, setNuevoPuesto] = useState(false);
  const [puestoCreadoId, setPuestoCreadoId] = useState<number | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(schema),
    defaultValues: {
      nombres: empleado?.nombres ?? '',
      apellidos: empleado?.apellidos ?? '',
      dpi: empleado?.dpi ?? '',
      telefono: empleado?.telefono ?? '',
      email: empleado?.email ?? '',
      direccion: empleado?.direccion ?? '',
      fechaIngreso: empleado?.fechaIngreso ?? today(),
      puestoId: empleado?.puestoId ?? 0,
      frecuenciaPagoId: empleado?.frecuenciaPagoId ?? 0,
      salarioBase: empleado?.salarioBase,
      bancoDestino: empleado?.bancoDestino ?? '',
      numeroCuenta: empleado?.numeroCuenta ?? '',
    },
  });

  const frecuencia = frecuencias.data?.find((f) => f.id === watch('frecuenciaPagoId'));

  // Al crear un puesto desde aquí, se selecciona en cuanto aparece en la lista.
  useEffect(() => {
    if (puestoCreadoId && puestos.data?.some((p) => p.id === puestoCreadoId)) {
      setValue('puestoId', puestoCreadoId, { shouldValidate: true });
    }
  }, [puestoCreadoId, puestos.data, setValue]);

  const guardar = useMutation({
    mutationFn: (data: FormOutput) =>
      empleado ? api.patch<Empleado>(`/empleados/${empleado.id}`, data) : api.post<Empleado>('/empleados', data),
    onSuccess: (guardado) => {
      toast.success(empleado ? 'Empleado actualizado' : 'Empleado registrado');
      queryClient.invalidateQueries({ queryKey: ['empleados'] });
      queryClient.invalidateQueries({ queryKey: ['empleado', guardado.id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      router.push(`/empleados/${guardado.id}`);
    },
  });

  return (
    <form onSubmit={handleSubmit((d) => guardar.mutate(d))} className="space-y-6" noValidate>
      <Card>
        <CardHeader title="Datos personales" />
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Nombres" error={errors.nombres?.message}>
            {(id) => <Input id={id} invalid={!!errors.nombres} {...register('nombres')} />}
          </Field>
          <Field label="Apellidos" error={errors.apellidos?.message}>
            {(id) => <Input id={id} invalid={!!errors.apellidos} {...register('apellidos')} />}
          </Field>
          <Field label="DPI" error={errors.dpi?.message} hint="13 dígitos, puede escribirlo con espacios">
            {(id) => <Input id={id} inputMode="numeric" invalid={!!errors.dpi} {...register('dpi')} />}
          </Field>
          <Field label="Teléfono (opcional)" error={errors.telefono?.message}>
            {(id) => <Input id={id} type="tel" invalid={!!errors.telefono} {...register('telefono')} />}
          </Field>
          <Field label="Correo (opcional)" error={errors.email?.message}>
            {(id) => <Input id={id} type="email" invalid={!!errors.email} {...register('email')} />}
          </Field>
          <Field label="Fecha de ingreso" error={errors.fechaIngreso?.message}>
            {(id) => <Input id={id} type="date" invalid={!!errors.fechaIngreso} {...register('fechaIngreso')} />}
          </Field>
          <Field label="Dirección (opcional)" className="sm:col-span-2">
            {(id) => <Textarea id={id} rows={2} {...register('direccion')} />}
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader title="Trabajo y pago" />
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Puesto" error={errors.puestoId?.message}>
            {(id) => (
              <div className="flex gap-2">
                <Select id={id} invalid={!!errors.puestoId} {...register('puestoId', { valueAsNumber: true })}>
                  <option value={0}>Seleccione…</option>
                  {puestos.data
                    ?.filter((p) => p.activo || p.id === empleado?.puestoId)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre}
                      </option>
                    ))}
                </Select>
                {esAdmin && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setNuevoPuesto(true)}
                    aria-label="Nuevo puesto"
                    title="Crear un puesto nuevo"
                  >
                    <Plus className="size-4" />
                  </Button>
                )}
              </div>
            )}
          </Field>
          <Field label="Forma de pago" error={errors.frecuenciaPagoId?.message}>
            {(id) => (
              <Select id={id} invalid={!!errors.frecuenciaPagoId} {...register('frecuenciaPagoId', { valueAsNumber: true })}>
                <option value={0}>Seleccione…</option>
                {frecuencias.data?.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nombre}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field
            label={`Salario por pago (Q)${frecuencia ? ` — ${frecuencia.nombre.toLowerCase()}` : ''}`}
            error={errors.salarioBase?.message}
            hint="Lo que recibe en cada pago, antes de descuentos"
          >
            {(id) => (
              <Input
                id={id}
                type="number"
                step="0.01"
                min="0"
                invalid={!!errors.salarioBase}
                {...register('salarioBase', { valueAsNumber: true })}
              />
            )}
          </Field>
          <div className="hidden sm:block" />
          <Field label="Banco (opcional)">{(id) => <Input id={id} {...register('bancoDestino')} />}</Field>
          <Field label="Número de cuenta (opcional)" error={errors.numeroCuenta?.message}>
            {(id) => <Input id={id} inputMode="numeric" invalid={!!errors.numeroCuenta} {...register('numeroCuenta')} />}
          </Field>
        </div>
      </Card>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <ButtonLink href={empleado ? `/empleados/${empleado.id}` : '/empleados'} variant="secondary">
          Cancelar
        </ButtonLink>
        <Button type="submit" loading={guardar.isPending}>
          {empleado ? 'Guardar cambios' : 'Registrar empleado'}
        </Button>
      </div>
      <PuestoFormModal open={nuevoPuesto} onClose={() => setNuevoPuesto(false)} onGuardado={(p) => setPuestoCreadoId(p.id)} />
    </form>
  );
}
