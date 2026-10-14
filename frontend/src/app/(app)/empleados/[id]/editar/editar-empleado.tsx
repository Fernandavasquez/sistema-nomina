'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { ErrorState, PageHeader, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import { nombreCompleto } from '@/lib/format';
import type { Empleado } from '@/lib/types';
import { EmpleadoForm } from '../../empleado-form';

export function EditarEmpleado() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = useQuery({
    queryKey: ['empleado', Number(id), 'datos'],
    queryFn: () => api.get<Empleado>(`/empleados/${id}`),
  });

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={data ? `Editar: ${nombreCompleto(data)}` : 'Editar empleado'}
        back={{ href: `/empleados/${id}`, label: 'Volver a la ficha' }}
      />
      {isLoading && <Spinner />}
      {error && <ErrorState error={error} />}
      {data && <EmpleadoForm empleado={data} />}
    </div>
  );
}
