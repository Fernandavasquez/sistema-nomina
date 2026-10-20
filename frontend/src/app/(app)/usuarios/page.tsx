'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import {
  Alert,
  Badge,
  Button,
  Card,
  ErrorState,
  Field,
  Input,
  Modal,
  ModalFooter,
  PageHeader,
  Select,
  Spinner,
  Table,
  Td,
  Th,
} from '@/components/ui';
import { useEmpresas, useSesion } from '@/hooks/queries';
import { api } from '@/lib/api';
import { dateTime } from '@/lib/format';
import type { Rol, Usuario } from '@/lib/types';

export default function UsuariosPage() {
  const { usuario: yo, esAdmin, isLoading: cargandoSesion } = useSesion();
  const [editar, setEditar] = useState<Usuario | 'nuevo' | null>(null);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['usuarios'],
    queryFn: () => api.get<Usuario[]>('/usuarios'),
    enabled: esAdmin,
  });

  if (cargandoSesion) return <Spinner />;
  if (!esAdmin) return <Alert color="red">Esta sección es solo para administradores.</Alert>;

  return (
    <>
      <PageHeader
        title="Usuarios"
        description="Personas autorizadas para entrar al sistema."
        actions={
          <Button onClick={() => setEditar('nuevo')}>
            <Plus className="size-4" /> Nuevo usuario
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
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Nombre</Th>
                <Th>Usuario</Th>
                <Th>Rol</Th>
                <Th>Empresas</Th>
                <Th>Último acceso</Th>
                <Th>Estado</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {data?.map((u) => (
                <tr key={u.id}>
                  <Td>
                    <p className="font-medium text-slate-900">
                      {u.nombre} {u.apellido} {u.id === yo?.id && <span className="text-xs text-slate-500">(usted)</span>}
                    </p>
                    <p className="text-xs text-slate-500">{u.email}</p>
                  </Td>
                  <Td className="font-mono text-sm">{u.username}</Td>
                  <Td>{u.rol.nombre === 'ADMIN' ? <Badge color="blue">Administrador</Badge> : <Badge>Operador</Badge>}</Td>
                  <Td className="max-w-56 text-sm text-slate-600">
                    {u.rol.nombre === 'ADMIN' ? (
                      'Todas'
                    ) : u.empresas?.length ? (
                      u.empresas.map((e) => e.nombre).join(', ')
                    ) : (
                      <span className="text-amber-700">Ninguna</span>
                    )}
                  </Td>
                  <Td className="whitespace-nowrap text-slate-600">{dateTime(u.ultimoAcceso)}</Td>
                  <Td>{u.isActive ? <Badge color="green">Activo</Badge> : <Badge color="red">Desactivado</Badge>}</Td>
                  <Td className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => setEditar(u)} aria-label={`Editar ${u.username}`}>
                      <Pencil className="size-4" />
                    </Button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
      {editar && (
        <UsuarioModal
          usuario={editar === 'nuevo' ? undefined : editar}
          esYo={editar !== 'nuevo' && editar.id === yo?.id}
          onClose={() => setEditar(null)}
        />
      )}
    </>
  );
}

const schema = z.object({
  nombre: z.string().trim().min(2, 'Mínimo 2 letras'),
  apellido: z.string().trim().min(2, 'Mínimo 2 letras'),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9._-]{3,50}$/, '3 a 50 caracteres: letras, números, punto o guion'),
  email: z.email('Correo inválido'),
  rolId: z.number().int().positive('Seleccione un rol'),
  isActive: z.boolean(),
  password: z.string(),
  empresaIds: z.array(z.number()),
});
type FormData = z.infer<typeof schema>;

function UsuarioModal({ usuario, esYo, onClose }: { usuario?: Usuario; esYo: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const roles = useQuery({ queryKey: ['roles'], queryFn: () => api.get<Rol[]>('/roles') });
  const empresas = useEmpresas();
  const {
    register,
    handleSubmit,
    setError,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      nombre: usuario?.nombre ?? '',
      apellido: usuario?.apellido ?? '',
      username: usuario?.username ?? '',
      email: usuario?.email ?? '',
      rolId: usuario?.rolId ?? 0,
      isActive: usuario?.isActive ?? true,
      password: '',
      empresaIds: usuario?.empresas?.map((e) => e.id) ?? [],
    },
  });
  const empresaIds = watch('empresaIds');
  const esAdminElegido = roles.data?.find((r) => r.id === watch('rolId'))?.nombre === 'ADMIN';

  const guardar = useMutation({
    mutationFn: ({ password, ...data }: FormData) => {
      const body = password ? { ...data, password } : data;
      return usuario ? api.patch(`/usuarios/${usuario.id}`, body) : api.post('/usuarios', body);
    },
    onSuccess: () => {
      toast.success('Usuario guardado');
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      onClose();
    },
  });

  function onSubmit(data: FormData) {
    // Al crear, la contraseña es obligatoria; al editar, solo si se quiere cambiar.
    if ((!usuario || data.password) && data.password.length < 8) {
      setError('password', { message: 'Mínimo 8 caracteres' });
      return;
    }
    if (!esAdminElegido && !data.empresaIds.length) {
      setError('empresaIds', { message: 'Elija al menos una empresa' });
      return;
    }
    guardar.mutate(data);
  }

  return (
    <Modal open onClose={onClose} title={usuario ? 'Editar usuario' : 'Nuevo usuario'}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre" error={errors.nombre?.message}>
            {(id) => <Input id={id} invalid={!!errors.nombre} {...register('nombre')} />}
          </Field>
          <Field label="Apellido" error={errors.apellido?.message}>
            {(id) => <Input id={id} invalid={!!errors.apellido} {...register('apellido')} />}
          </Field>
          <Field label="Usuario" error={errors.username?.message}>
            {(id) => <Input id={id} autoComplete="off" invalid={!!errors.username} {...register('username')} />}
          </Field>
          <Field label="Correo" error={errors.email?.message}>
            {(id) => <Input id={id} type="email" invalid={!!errors.email} {...register('email')} />}
          </Field>
          <Field label="Rol" error={errors.rolId?.message}>
            {(id) => (
              <Select id={id} invalid={!!errors.rolId} {...register('rolId', { valueAsNumber: true })}>
                <option value={0}>Seleccione…</option>
                {roles.data?.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.nombre === 'ADMIN' ? 'Administrador' : 'Operador'}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field
            label={usuario ? 'Nueva contraseña (opcional)' : 'Contraseña'}
            error={errors.password?.message}
            hint={usuario ? 'Déjela vacía para no cambiarla' : 'Mínimo 8 caracteres'}
          >
            {(id) => (
              <Input id={id} type="password" autoComplete="new-password" invalid={!!errors.password} {...register('password')} />
            )}
          </Field>
        </div>
        <fieldset>
          <legend className="text-sm font-medium text-slate-700">Empresas que puede ver</legend>
          {esAdminElegido ? (
            <p className="mt-1 text-sm text-slate-500">El administrador ve todas las empresas.</p>
          ) : (
            <>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {empresas.data?.map((e) => (
                  <label key={e.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={empresaIds.includes(e.id)}
                      onChange={(ev) =>
                        setValue(
                          'empresaIds',
                          ev.target.checked ? [...empresaIds, e.id] : empresaIds.filter((id) => id !== e.id),
                          { shouldValidate: true },
                        )
                      }
                      className="size-4 accent-emerald-600"
                    />
                    {e.nombre}
                    {!e.activo && <span className="text-xs text-slate-400">(inactiva)</span>}
                  </label>
                ))}
              </div>
              {errors.empresaIds && <p className="mt-1 text-sm text-red-600">{errors.empresaIds.message}</p>}
            </>
          )}
        </fieldset>
        {roles.data && (
          <p className="text-xs text-slate-500">
            {roles.data.map((r) => `${r.nombre === 'ADMIN' ? 'Administrador' : 'Operador'}: ${r.descripcion}`).join(' · ')}
          </p>
        )}
        {!esYo && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...register('isActive')} className="size-4 accent-emerald-600" />
            Puede iniciar sesión (activo)
          </label>
        )}
        <ModalFooter>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={guardar.isPending}>
            Guardar
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
