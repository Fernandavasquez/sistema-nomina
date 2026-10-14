'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Alert, Button, Field, Input } from '@/components/ui';

const schema = z.object({
  usuario: z.string().trim().min(1, 'Ingrese su usuario o correo'),
  password: z.string().min(1, 'Ingrese su contraseña'),
});
type FormData = z.infer<typeof schema>;

export function LoginForm() {
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    setError(null);
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(
        res.status === 429
          ? 'Demasiados intentos. Espere un minuto e intente de nuevo.'
          : (body.message ?? 'No se pudo iniciar sesión'),
      );
      return;
    }
    // Solo se permite volver a rutas internas (evita redirecciones a otros sitios).
    const next = params.get('next');
    window.location.assign(next?.startsWith('/') && !next.startsWith('//') ? next : '/');
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5" noValidate>
      {error && <Alert color="red">{error}</Alert>}
      <Field label="Usuario o correo" error={errors.usuario?.message}>
        {(id) => <Input id={id} autoComplete="username" autoFocus invalid={!!errors.usuario} {...register('usuario')} />}
      </Field>
      <Field label="Contraseña" error={errors.password?.message}>
        {(id) => (
          <Input id={id} type="password" autoComplete="current-password" invalid={!!errors.password} {...register('password')} />
        )}
      </Field>
      <Button type="submit" className="w-full" loading={isSubmitting}>
        Ingresar
      </Button>
    </form>
  );
}
