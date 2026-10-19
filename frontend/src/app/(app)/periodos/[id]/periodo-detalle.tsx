'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ban, Calculator, CheckCircle2, FilePlus2, RotateCcw, Trash2 } from 'lucide-react';
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
import { AnularModal, AvisoAnulacion } from '@/components/forms/anular-modal';
import { useSesion } from '@/hooks/queries';
import { api } from '@/lib/api';
import { date, money, nombrePeriodo } from '@/lib/format';
import type { Nomina, PeriodoDetalle } from '@/lib/types';

type Accion = 'procesar' | 'revertir' | 'cerrar' | 'eliminar' | 'anular';

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
    mutationFn: ({ a, motivo }: { a: Accion; motivo?: string }) =>
      a === 'eliminar'
        ? api.delete(`/periodos-nomina/${id}`)
        : api.post<PeriodoDetalle>(`/periodos-nomina/${id}/${a}`, motivo ? { motivo } : undefined),
    onSuccess: (_r, { a }) => {
      const mensajes: Record<Accion, string> = {
        procesar: 'Nómina calculada',
        revertir: 'Procesamiento revertido',
        cerrar: 'Pago confirmado. Adelantos y préstamos actualizados.',
        eliminar: 'Período eliminado',
        anular: 'Período anulado. Adelantos y préstamos volvieron a como estaban antes del pago.',
      };
      toast.success(mensajes[a]);
      // Cerrar un período cambia adelantos, préstamos y el dashboard: se refresca todo.
      queryClient.invalidateQueries();
      if (a === 'eliminar') router.push('/periodos');
    },
    onSettled: () => setConfirmar(null),
  });

  // Emite una boleta nueva para un empleado cuya boleta se anuló en este período.
  const reemitir = useMutation({
    mutationFn: (empleadoId: number) => api.post<{ nominaId: number }>(`/periodos-nomina/${id}/reemitir/${empleadoId}`),
    onSuccess: ({ nominaId }) => {
      toast.success('Boleta nueva generada. Revísela y confirme el pago.');
      queryClient.invalidateQueries();
      router.push(`/nominas/${nominaId}`);
    },
  });

  if (isLoading) return <Spinner />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  if (!p) return null;

  const { resumen } = p;
  // Boleta anulada de un empleado que aún no tiene una boleta nueva en este período.
  const sinBoletaVigente = (n: Nomina) =>
    n.estado === 'ANULADA' && !p.nominas.some((o) => o.empleadoId === n.empleadoId && o.estado !== 'ANULADA');

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
            {esAdmin && p.estado === 'CERRADO' && (
              <Button variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => setConfirmar('anular')}>
                <Ban className="size-4" /> Anular período
              </Button>
            )}
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

      {p.estado === 'ANULADO' && <AvisoAnulacion texto="Este período fue anulado" anulacion={p} />}
      {resumen.boletasPorConfirmar > 0 && (
        <div className="mb-3">
          <Alert color="amber">
            Hay {resumen.boletasPorConfirmar} boleta(s) nueva(s) pendiente(s) de confirmar. Ábrala para revisarla y
            {esAdmin ? ' confirmar el pago.' : ' pida a un administrador que confirme el pago.'}
          </Alert>
        </div>
      )}
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
          <Stat
            label="Empleados"
            value={resumen.empleados}
            hint={resumen.boletasAnuladas ? `${resumen.boletasAnuladas} boleta(s) anulada(s)` : undefined}
          />
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
              {p.nominas.map((n) => {
                const anulada = n.estado === 'ANULADA';
                return (
                  <tr key={n.id} className={anulada ? 'bg-red-50/40 text-slate-400' : 'hover:bg-slate-50'}>
                    <Td className={anulada ? '' : 'font-medium text-slate-900'}>
                      <span className="flex flex-wrap items-center gap-2">
                        {n.empleado?.apellidos}, {n.empleado?.nombres}
                        {anulada && <EstadoBadge estado="ANULADA" />}
                        {n.estado === 'GENERADA' && p.estado === 'CERRADO' && <EstadoBadge estado="GENERADA" />}
                      </span>
                    </Td>
                    <Td className="text-slate-600">
                      {n.empleado?.bancoDestino ? `${n.empleado.bancoDestino} · ${n.empleado.numeroCuenta ?? ''}` : 'Efectivo'}
                    </Td>
                    <Td className={`tabular text-right ${anulada ? 'line-through' : ''}`}>{money(n.totalPercepciones)}</Td>
                    <Td className={`tabular text-right ${anulada ? 'line-through' : 'text-red-700'}`}>
                      {money(n.totalDeducciones)}
                    </Td>
                    <Td
                      className={`tabular text-right font-semibold ${anulada ? 'line-through' : n.liquidoRecibir < 0 ? 'text-red-600' : 'text-slate-900'}`}
                    >
                      {money(n.liquidoRecibir)}
                    </Td>
                    <Td className="text-right whitespace-nowrap">
                      <span className="flex items-center justify-end gap-3">
                        {p.estado === 'CERRADO' && sinBoletaVigente(n) && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => reemitir.mutate(n.empleadoId)}
                            loading={reemitir.isPending && reemitir.variables === n.empleadoId}
                          >
                            <FilePlus2 className="size-4" /> Boleta nueva
                          </Button>
                        )}
                        <Link href={`/nominas/${n.id}`} className="text-sm font-medium text-emerald-700 hover:underline">
                          Ver boleta
                        </Link>
                      </span>
                    </Td>
                  </tr>
                );
              })}
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
        onConfirm={() => accion.mutate({ a: 'procesar' })}
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
        onConfirm={() => accion.mutate({ a: 'revertir' })}
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
        onConfirm={() => accion.mutate({ a: 'cerrar' })}
        loading={accion.isPending}
        title="Cerrar período y confirmar pago"
        confirmText={`Confirmar pago de ${money(resumen.totalLiquido)}`}
      >
        <p>Al confirmar:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Los adelantos incluidos quedarán como descontados.</li>
          <li>Se rebajará el saldo de los préstamos.</li>
          <li>Las boletas quedarán como pagadas y no se podrán modificar.</li>
          <li>Si hubo un error, un administrador podrá anular el pago después.</li>
        </ul>
      </ConfirmDialog>
      <AnularModal
        open={confirmar === 'anular'}
        onClose={() => setConfirmar(null)}
        onConfirmar={(motivo) => accion.mutate({ a: 'anular', motivo })}
        loading={accion.isPending}
        titulo={`Anular ${nombrePeriodo(p)}`}
      >
        <p>Se anulará el pago completo del período ({money(resumen.totalLiquido)}):</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Los adelantos descontados vuelven a quedar pendientes.</li>
          <li>Los préstamos recuperan el saldo de las cuotas descontadas.</li>
          <li>El período y sus boletas quedan como ANULADOS (no se borran).</li>
          <li>Después puede crear un período nuevo con las mismas fechas y volver a calcular.</li>
        </ul>
      </AnularModal>
      <ConfirmDialog
        open={confirmar === 'eliminar'}
        onClose={() => setConfirmar(null)}
        onConfirm={() => accion.mutate({ a: 'eliminar' })}
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
