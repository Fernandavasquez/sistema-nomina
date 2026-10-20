'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Banknote, FileText, HandCoins, Pencil, Trash2, UserCheck, UserX } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { AdelantoFormModal } from '@/components/forms/adelanto-form';
import { PrestamoFormModal } from '@/components/forms/prestamo-form';
import {
  Button,
  ButtonLink,
  Card,
  CardHeader,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  EstadoBadge,
  InfoRow,
  PageHeader,
  Spinner,
  Stat,
  Table,
  Td,
  Th,
} from '@/components/ui';
import { useSesion } from '@/hooks/queries';
import { api } from '@/lib/api';
import { date, dpi, money, nombreCompleto, nombrePeriodo } from '@/lib/format';
import type { Empleado, EstadoCuenta } from '@/lib/types';
import { DocumentoEmpleado } from './documento-empleado';
import { descargarArchivo } from '@/lib/descargar';
import { salarioPorPago } from '@/lib/salario';

export function EmpleadoDetalle() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { esAdmin } = useSesion();
  const [descargando, setDescargando] = useState(false);
  const [modal, setModal] = useState<'adelanto' | 'prestamo' | 'estado' | 'eliminar' | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['empleado', Number(id), 'estado-cuenta'],
    queryFn: () => api.get<EstadoCuenta>(`/empleados/${id}/estado-cuenta`),
  });

  const cambiarEstado = useMutation({
    mutationFn: (estado: Empleado['estado']) => api.patch<Empleado>(`/empleados/${id}`, { estado }),
    onSuccess: (e) => {
      toast.success(e.estado === 'ACTIVO' ? 'Empleado activado' : 'Empleado inactivado');
      queryClient.invalidateQueries({ queryKey: ['empleado'] });
      queryClient.invalidateQueries({ queryKey: ['empleados'] });
      setModal(null);
    },
  });

  const eliminar = useMutation({
    mutationFn: () => api.delete(`/empleados/${id}`),
    onSuccess: () => {
      toast.success('Empleado eliminado');
      queryClient.invalidateQueries({ queryKey: ['empleados'] });
      router.push('/empleados');
    },
    onSettled: () => setModal(null),
  });

  if (isLoading) return <Spinner />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  if (!data) return null;

  const e = data.empleado;
  const activo = e.estado === 'ACTIVO';

  /** Ficha completa en PDF: datos, salario, estado de cuenta, últimos pagos y documentos. */
  async function descargarFicha() {
    setDescargando(true);
    try {
      await descargarArchivo(`/empleados/${e.id}/ficha-pdf`, 'ficha-empleado.pdf');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setDescargando(false);
    }
  }

  return (
    <>
      <PageHeader
        back={{ href: '/empleados', label: 'Empleados' }}
        title={nombreCompleto(e)}
        description={
          <span className="flex flex-wrap items-center gap-2">
            {e.puesto.nombre} · Pago {e.frecuenciaPago.nombre.toLowerCase()} <EstadoBadge estado={e.estado} />
          </span>
        }
        actions={
          <>
            {activo && (
              <>
                <Button variant="secondary" onClick={() => setModal('adelanto')}>
                  <HandCoins className="size-4" /> Adelanto
                </Button>
                <Button variant="secondary" onClick={() => setModal('prestamo')}>
                  <Banknote className="size-4" /> Préstamo
                </Button>
              </>
            )}
            <Button variant="secondary" onClick={descargarFicha} loading={descargando}>
              {!descargando && <FileText className="size-4 text-red-600" />} PDF
            </Button>
            <ButtonLink href={`/empleados/${e.id}/editar`}>
              <Pencil className="size-4" /> Editar
            </ButtonLink>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat
          label="Salario mensual"
          value={money(e.salarioMensual)}
          hint={`Pago ${e.frecuenciaPago.nombre.toLowerCase()}: ${money(salarioPorPago(e.salarioMensual, e.frecuenciaPago))}`}
        />
        <Stat
          label="Adelantos por descontar"
          value={money(data.totalAdelantosPendientes)}
          hint={`${data.adelantosPendientes.length} pendiente(s)`}
        />
        <Stat
          label="Saldo de préstamos"
          value={money(data.totalSaldoPrestamos)}
          hint={`${data.prestamosActivos.length} activo(s)`}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Adelantos pendientes" description="Se descontarán en el próximo pago" />
            {data.adelantosPendientes.length === 0 ? (
              <EmptyState title="Sin adelantos pendientes" />
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Fecha</Th>
                    <Th>Observación</Th>
                    <Th className="text-right">Monto</Th>
                  </tr>
                </thead>
                <tbody>
                  {data.adelantosPendientes.map((a) => (
                    <tr key={a.id}>
                      <Td>{date(a.fechaSolicitud)}</Td>
                      <Td className="text-slate-600">{a.observacion ?? '—'}</Td>
                      <Td className="tabular text-right font-medium">{money(a.monto)}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>

          <Card>
            <CardHeader title="Préstamos activos" />
            {data.prestamosActivos.length === 0 ? (
              <EmptyState title="Sin préstamos activos" />
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Fecha</Th>
                    <Th className="text-right">Préstamo</Th>
                    <Th className="text-right">Cuota</Th>
                    <Th className="text-right">Saldo</Th>
                  </tr>
                </thead>
                <tbody>
                  {data.prestamosActivos.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <Td>
                        <Link href={`/prestamos/${p.id}`} className="font-medium text-emerald-700 hover:underline">
                          {date(p.fechaSolicitud)}
                        </Link>
                      </Td>
                      <Td className="tabular text-right">{money(p.montoTotal)}</Td>
                      <Td className="tabular text-right">{money(p.montoCuota)}</Td>
                      <Td className="tabular text-right font-medium">{money(p.saldoPendiente)}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>

          <Card>
            <CardHeader title="Últimos pagos" />
            {data.ultimasNominas.length === 0 ? (
              <EmptyState title="Aún no tiene pagos registrados" />
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Período</Th>
                    <Th className="text-right">Percepciones</Th>
                    <Th className="text-right">Deducciones</Th>
                    <Th className="text-right">Líquido</Th>
                    <Th>Estado</Th>
                  </tr>
                </thead>
                <tbody>
                  {data.ultimasNominas.map((n) => (
                    <tr key={n.id} className="hover:bg-slate-50">
                      <Td>
                        <Link href={`/nominas/${n.id}`} className="font-medium text-emerald-700 hover:underline">
                          {n.periodo ? nombrePeriodo({ ...n.periodo, frecuenciaPago: e.frecuenciaPago }) : `#${n.id}`}
                        </Link>
                      </Td>
                      <Td className="tabular text-right">{money(n.totalPercepciones)}</Td>
                      <Td className="tabular text-right text-red-700">{money(n.totalDeducciones)}</Td>
                      <Td className="tabular text-right font-medium">{money(n.liquidoRecibir)}</Td>
                      <Td>
                        <EstadoBadge estado={n.estado} />
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Datos del empleado" />
            <dl className="divide-y divide-slate-100 px-5 py-1">
              <InfoRow label="DPI">{dpi(e.dpi)}</InfoRow>
              <InfoRow label="Teléfono">{e.telefono}</InfoRow>
              <InfoRow label="Correo">{e.email}</InfoRow>
              <InfoRow label="Dirección">{e.direccion}</InfoRow>
              <InfoRow label="Fecha de ingreso">{date(e.fechaIngreso)}</InfoRow>
              <InfoRow label="Banco">{e.bancoDestino}</InfoRow>
              <InfoRow label="No. de cuenta">{e.numeroCuenta}</InfoRow>
            </dl>
          </Card>

          <DocumentoEmpleado empleado={e} tipo="foto-dpi" />
          <DocumentoEmpleado empleado={e} tipo="recibo-luz" />

          <Card className="p-5">
            <p className="text-sm font-medium text-slate-900">Acciones</p>
            <div className="mt-3 flex flex-col gap-2">
              <Button variant="secondary" onClick={() => setModal('estado')}>
                {activo ? <UserX className="size-4" /> : <UserCheck className="size-4" />}
                {activo ? 'Inactivar empleado' : 'Activar empleado'}
              </Button>
              {esAdmin && (
                <Button variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => setModal('eliminar')}>
                  <Trash2 className="size-4" /> Eliminar
                </Button>
              )}
            </div>
          </Card>
        </div>
      </div>

      <AdelantoFormModal open={modal === 'adelanto'} onClose={() => setModal(null)} empleado={e} />
      <PrestamoFormModal open={modal === 'prestamo'} onClose={() => setModal(null)} empleado={e} />
      <ConfirmDialog
        open={modal === 'estado'}
        onClose={() => setModal(null)}
        onConfirm={() => cambiarEstado.mutate(activo ? 'INACTIVO' : 'ACTIVO')}
        loading={cambiarEstado.isPending}
        title={activo ? 'Inactivar empleado' : 'Activar empleado'}
        confirmText={activo ? 'Inactivar' : 'Activar'}
        variant={activo ? 'danger' : 'primary'}
      >
        {activo ? (
          <p>
            <strong>{nombreCompleto(e)}</strong> ya no se incluirá en los próximos pagos ni podrá recibir adelantos o préstamos.
            Su historial se conserva.
          </p>
        ) : (
          <p>
            <strong>{nombreCompleto(e)}</strong> volverá a incluirse en los pagos.
          </p>
        )}
      </ConfirmDialog>
      <ConfirmDialog
        open={modal === 'eliminar'}
        onClose={() => setModal(null)}
        onConfirm={() => eliminar.mutate()}
        loading={eliminar.isPending}
        title="Eliminar empleado"
        confirmText="Eliminar definitivamente"
        variant="danger"
      >
        <p>
          Solo se puede eliminar un empleado sin historial (sin pagos, adelantos ni préstamos). Si ya tiene historial, inactívelo.
        </p>
      </ConfirmDialog>
    </>
  );
}
