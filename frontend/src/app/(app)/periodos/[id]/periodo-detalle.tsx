'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Calculator, CheckCircle2, RotateCcw, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  Alert,
  Button,
  Card,
  CardHeader,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  EstadoBadge,
  PageHeader,
  Spinner,
  Stat,
  Table,
  Td,
  Th,
} from '@/components/ui';
import { BotonesDescarga } from '@/components/botones-descarga';
import { useSesion } from '@/hooks/queries';
import { api } from '@/lib/api';
import { date, money, nombrePeriodo } from '@/lib/format';
import type { PeriodoDetalle } from '@/lib/types';

type Accion = 'procesar' | 'revertir' | 'cerrar' | 'eliminar';

export function PeriodoDetalle() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { esAdmin } = useSesion();
  const [confirmar, setConfirmar] = useState<Accion | null>(null);

  const {
    data: p,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['periodos', Number(id)],
    queryFn: () => api.get<PeriodoDetalle>(`/periodos-nomina/${id}`),
  });

  const accion = useMutation({
    mutationFn: (a: Accion) =>
      a === 'eliminar' ? api.delete(`/periodos-nomina/${id}`) : api.post<PeriodoDetalle>(`/periodos-nomina/${id}/${a}`),
    onSuccess: (_r, a) => {
      const mensajes: Record<Accion, string> = {
        procesar: 'Nómina calculada',
        revertir: 'Procesamiento revertido',
        cerrar: 'Pago confirmado. Adelantos y préstamos actualizados.',
        eliminar: 'Período eliminado',
      };
      toast.success(mensajes[a]);
      // Cerrar un período cambia adelantos, préstamos y el dashboard: se refresca todo.
      queryClient.invalidateQueries();
      if (a === 'eliminar') router.push('/periodos');
    },
    onSettled: () => setConfirmar(null),
  });

  if (isLoading) return <Spinner />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  if (!p) return null;

  const { resumen } = p;

  return (
    <>
      <PageHeader
        back={{ href: '/periodos', label: 'Períodos' }}
        title={nombrePeriodo(p)}
        description={
          <span className="flex flex-wrap items-center gap-2">
            Del {date(p.fechaInicio)} al {date(p.fechaFin)} · Pago: {date(p.fechaPago)} <EstadoBadge estado={p.estado} />
          </span>
        }
        actions={
          <>
            {/* Descarga de la planilla (solo administrador, cuando ya hay nóminas calculadas) */}
            {esAdmin && p.estado !== 'ABIERTO' && <BotonesDescarga ruta={`/reportes/planilla/${p.id}`} />}
            {p.estado === 'ABIERTO' && (
              <>
                <Button variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => setConfirmar('eliminar')}>
                  <Trash2 className="size-4" /> Eliminar
                </Button>
                <Button onClick={() => setConfirmar('procesar')}>
                  <Calculator className="size-4" /> Calcular nómina
                </Button>
              </>
            )}
            {p.estado === 'PROCESADO' && (
              <>
                <Button variant="secondary" onClick={() => setConfirmar('revertir')}>
                  <RotateCcw className="size-4" /> Revertir
                </Button>
                <Button variant="secondary" onClick={() => setConfirmar('procesar')}>
                  <Calculator className="size-4" /> Recalcular
                </Button>
                {esAdmin && (
                  <Button onClick={() => setConfirmar('cerrar')} disabled={resumen.nominasConLiquidoNegativo > 0}>
                    <CheckCircle2 className="size-4" /> Cerrar y pagar
                  </Button>
                )}
              </>
            )}
          </>
        }
      />

      {p.estado === 'ABIERTO' && (
        <Alert color="amber">
          Este período está abierto. Registre los adelantos y préstamos que correspondan y luego presione{' '}
          <strong>Calcular nómina</strong>.
        </Alert>
      )}
      {p.estado === 'PROCESADO' && (
        <Alert color="blue">
          Revise cada boleta. Puede agregar bonos o descuentos manuales. Si corrige un adelanto o un empleado, presione{' '}
          <strong>Recalcular</strong>.{!esAdmin && ' Un administrador debe cerrar el período para confirmar el pago.'}
        </Alert>
      )}
      {resumen.nominasConLiquidoNegativo > 0 && (
        <div className="mt-3">
          <Alert color="red">
            Hay {resumen.nominasConLiquidoNegativo} nómina(s) con líquido negativo (los descuentos superan el salario). Corríjalas
            antes de cerrar.
          </Alert>
        </div>
      )}

      {p.estado !== 'ABIERTO' && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Empleados" value={resumen.empleados} />
          <Stat label="Percepciones" value={money(resumen.totalPercepciones)} />
          <Stat label="Deducciones" value={money(resumen.totalDeducciones)} />
          <Stat label="Total a pagar" value={money(resumen.totalLiquido)} />
        </div>
      )}

      <Card className="mt-6">
        <CardHeader title="Nóminas del período" />
        {p.nominas.length === 0 ? (
          <EmptyState
            title="Aún no se ha calculado la nómina"
            description={`Al calcular se incluirán todos los empleados activos con pago ${p.frecuenciaPago.nombre.toLowerCase()}.`}
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Empleado</Th>
                <Th>Banco / cuenta</Th>
                <Th className="text-right">Percepciones</Th>
                <Th className="text-right">Deducciones</Th>
                <Th className="text-right">Líquido a recibir</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {p.nominas.map((n) => (
                <tr key={n.id} className="hover:bg-slate-50">
                  <Td className="font-medium text-slate-900">
                    {n.empleado?.apellidos}, {n.empleado?.nombres}
                  </Td>
                  <Td className="text-slate-600">
                    {n.empleado?.bancoDestino ? `${n.empleado.bancoDestino} · ${n.empleado.numeroCuenta ?? ''}` : 'Efectivo'}
                  </Td>
                  <Td className="tabular text-right">{money(n.totalPercepciones)}</Td>
                  <Td className="tabular text-right text-red-700">{money(n.totalDeducciones)}</Td>
                  <Td className={`tabular text-right font-semibold ${n.liquidoRecibir < 0 ? 'text-red-600' : 'text-slate-900'}`}>
                    {money(n.liquidoRecibir)}
                  </Td>
                  <Td className="text-right">
                    <Link href={`/nominas/${n.id}`} className="text-sm font-medium text-emerald-700 hover:underline">
                      Ver boleta
                    </Link>
                  </Td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 font-semibold">
                <Td>Total</Td>
                <Td />
                <Td className="tabular text-right">{money(resumen.totalPercepciones)}</Td>
                <Td className="tabular text-right text-red-700">{money(resumen.totalDeducciones)}</Td>
                <Td className="tabular text-right">{money(resumen.totalLiquido)}</Td>
                <Td />
              </tr>
            </tfoot>
          </Table>
        )}
      </Card>

      <ConfirmDialog
        open={confirmar === 'procesar'}
        onClose={() => setConfirmar(null)}
        onConfirm={() => accion.mutate('procesar')}
        loading={accion.isPending}
        title={p.estado === 'PROCESADO' ? 'Recalcular nómina' : 'Calcular nómina'}
        confirmText="Calcular"
      >
        <p>Se generará la nómina de cada empleado activo con pago {p.frecuenciaPago.nombre.toLowerCase()}:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Sueldo base del período</li>
          <li>Descuento de adelantos pendientes</li>
          <li>Cuota de préstamos activos</li>
        </ul>
        {p.estado === 'PROCESADO' && <p>Los bonos y descuentos manuales se conservan.</p>}
      </ConfirmDialog>
      <ConfirmDialog
        open={confirmar === 'revertir'}
        onClose={() => setConfirmar(null)}
        onConfirm={() => accion.mutate('revertir')}
        loading={accion.isPending}
        title="Revertir procesamiento"
        confirmText="Revertir"
        variant="danger"
      >
        <p>Se eliminarán las nóminas calculadas (incluidos los bonos manuales) y el período volverá a estar abierto.</p>
      </ConfirmDialog>
      <ConfirmDialog
        open={confirmar === 'cerrar'}
        onClose={() => setConfirmar(null)}
        onConfirm={() => accion.mutate('cerrar')}
        loading={accion.isPending}
        title="Cerrar período y confirmar pago"
        confirmText={`Confirmar pago de ${money(resumen.totalLiquido)}`}
      >
        <p>Esta acción no se puede deshacer:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Los adelantos incluidos quedarán como descontados.</li>
          <li>Se rebajará el saldo de los préstamos.</li>
          <li>Las boletas quedarán como pagadas y no se podrán modificar.</li>
        </ul>
      </ConfirmDialog>
      <ConfirmDialog
        open={confirmar === 'eliminar'}
        onClose={() => setConfirmar(null)}
        onConfirm={() => accion.mutate('eliminar')}
        loading={accion.isPending}
        title="Eliminar período"
        confirmText="Eliminar"
        variant="danger"
      >
        <p>¿Eliminar {nombrePeriodo(p)}?</p>
      </ConfirmDialog>
    </>
  );
}
