import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageHeader, Spinner } from '@/components/ui';
import { EmpleadoForm } from '../empleado-form';

export const metadata: Metadata = { title: 'Nuevo empleado' };

export default function NuevoEmpleadoPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Nuevo empleado" back={{ href: '/empleados', label: 'Empleados' }} />
      {/* Suspense: el formulario usa la fecha de hoy, que se calcula en cada visita */}
      <Suspense fallback={<Spinner />}>
        <EmpleadoForm />
      </Suspense>
    </div>
  );
}
