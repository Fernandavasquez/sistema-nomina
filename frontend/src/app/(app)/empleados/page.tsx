import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Spinner } from '@/components/ui';
import { EmpleadosView } from './empleados-view';

export const metadata: Metadata = { title: 'Empleados' };

export default function EmpleadosPage() {
  // Suspense: la vista lee filtros de la URL (?puestoId=...), que solo se conocen al visitar la página.
  return (
    <Suspense fallback={<Spinner />}>
      <EmpleadosView />
    </Suspense>
  );
}
