import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Spinner } from '@/components/ui';
import { EmpleadoDetalle } from './empleado-detalle';

export const metadata: Metadata = { title: 'Empleado' };

/** El id viene de la URL, que solo se conoce al visitar la página: por eso va dentro de <Suspense>. */
export default function Page() {
  return (
    <Suspense fallback={<Spinner />}>
      <EmpleadoDetalle />
    </Suspense>
  );
}
