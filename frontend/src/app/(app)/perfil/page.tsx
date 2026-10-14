'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button, Card, CardHeader, Field, InfoRow, Input, PageHeader } from '@/components/ui';
import { useSesion } from '@/hooks/queries';
import { api } from '@/lib/api';

const schema = z
  .object({
    passwordActual: z.string().min(1, 'Ingrese su contraseña actual'),
    passwordNueva: z.string().min(8, 'Mínimo 8 caracteres'),
    confirmar: z.string(),
  })
  .refine((d) => d.passwordNueva === d.confirmar, { path: ['confirmar'], message: 'Las contraseñas no coinciden' });
type FormData = z.infer<typeof schema>;

export default function PerfilPage() {
  const { usuario } = useSesion();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const cambiar = useMutation({
    mutationFn: ({ passwordActual, passwordNueva }: FormData) =>
      api.patch('/auth/cambiar-password', { passwordActual, passwordNueva }),
    onSuccess: () => {
      toast.success('Contraseña actualizada');
      reset();
    },
  });

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageHeader title="Mi cuenta" />
      {usuario && (
        <Card>
          <CardHeader title="Datos" />
          <dl className="divide-y divide-slate-100 px-5 py-1">
            <InfoRow label="Nombre">
              {usuario.nombre} {usuario.apellido}
            </InfoRow>
            <InfoRow label="Usuario">{usuario.username}</InfoRow>
            <InfoRow label="Correo">{usuario.email}</InfoRow>
            <InfoRow label="Rol">{usuario.rol.nombre === 'ADMIN' ? 'Administrador' : 'Operador'}</InfoRow>
          </dl>
        </Card>
      )}
      <Card>
        <CardHeader title="Cambiar contraseña" />
        <form onSubmit={handleSubmit((d) => cambiar.mutate(d))} className="space-y-4 p-5" noValidate>
          <Field label="Contraseña actual" error={errors.passwordActual?.message}>
            {(id) => (
              <Input
                id={id}
                type="password"
                autoComplete="current-password"
                invalid={!!errors.passwordActual}
                {...register('passwordActual')}
              />
            )}
          </Field>
          <Field label="Nueva contraseña" error={errors.passwordNueva?.message}>
            {(id) => (
              <Input
                id={id}
                type="password"
                autoComplete="new-password"
                invalid={!!errors.passwordNueva}
                {...register('passwordNueva')}
              />
            )}
          </Field>
          <Field label="Repita la nueva contraseña" error={errors.confirmar?.message}>
            {(id) => (
              <Input
                id={id}
                type="password"
                autoComplete="new-password"
                invalid={!!errors.confirmar}
                {...register('confirmar')}
              />
            )}
          </Field>
          <div className="flex justify-end">
            <Button type="submit" loading={cambiar.isPending}>
              Cambiar contraseña
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
