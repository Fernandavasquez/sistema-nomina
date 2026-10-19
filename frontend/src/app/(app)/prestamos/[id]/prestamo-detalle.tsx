'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ban, Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import {
  Button,
  Card,
  CardHeader,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  EstadoBadge,
  Field,
  InfoRow,
  Input,
  Modal,
  ModalFooter,
  PageHeader,
  Spinner,
  Stat,
  Table,
  Td,
  Textarea,
  Th,
} from '@/components/ui';
import { api } from '@/lib/api';
import { date, money, nombreCompleto, nombrePeriodo } from '@/lib/format';
import type { PrestamoDetalle } from '@/lib/types';

export function PrestamoDetalle() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [modal, setModal] = useState<'cuota' | 'cancelar' | 'eliminar' | null>(null);

  const {
    data: p,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['prestamos', Number(id)],
    queryFn: () => api.get<PrestamoDetalle>(`/prestamos/${id}`),
  });

  const invalidar = () => {
    queryClient.invalidateQueries({ queryKey: ['prestamos'] });
    queryClient.invalidateQueries({ queryKey: ['empleado'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const eliminar = useMutation({
    mutationFn: () => api.delete(`/prestamos/${id}`),
    onSuccess: () => {
      toast.success('Préstamo eliminado');
      invalidar();
      router.push('/prestamos');
    },
    onSettled: () => setModal(null),
  });

  if (isLoading) return <Spinner />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  if (!p) return null;

  const activo = p.estado === 'ACTIVO';
  const pagado = p.montoTotal - p.saldoPendiente;

  return (
    <>
      <PageHeader
        back={{ href: '/prestamos', label: 'Préstamos' }}
        title={`Préstamo de ${money(p.montoTotal)}`}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Link href={`/empleados/${p.empleadoId}`} className="hover:text-emerald-700">
              {nombreCompleto(p.empleado)}
            </Link>
            · {date(p.fechaSolicitud)} <EstadoBadge estado={p.estado} />
          </span>
        }
        actions={
          activo && (
            <>
              <Button variant="secondary" onClick={() => setModal('cuota')}>
                <Pencil className="size-4" /> Cambiar cuota
              </Button>
              <Button variant="secondary" onClick={() => setModal('cancelar')}>
                <Ban className="size-4" /> Cancelar préstamo
              </Button>
              {p.abonos.length === 0 && (
                <Button variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => setModal('eliminar')}>
                  <Trash2 className="size-4" /> Eliminar
                </Button>
              )}
            </>
          )
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Saldo pendiente" value={money(p.saldoPendiente)} />
        <Stat label="Pagado" value={money(pagado)} hint={`${Math.round((pagado / p.montoTotal) * 100)}% del total`} />
        <Stat
          label="Cuota por pago"
          value={money(p.montoCuota)}
          hint={activo ? `Faltan aprox. ${Math.ceil(p.saldoPendiente / p.montoCuota)} pago(s)` : undefined}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Historial de cuotas" description="Descuentos aplicados en las nóminas" />
          {p.abonos.length === 0 ? (
            <EmptyState title="Aún no se ha descontado ninguna cuota" />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Período</Th>
                  <Th>Fecha de pago</Th>
                  <Th className="text-right">Cuota</Th>
                  <Th>Estado</Th>
                </tr>
              </thead>
              <tbody>
                {p.abonos.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <Td>
                      <Link href={`/nominas/${a.nominaId}`} className="font-medium text-emerald-700 hover:underline">
                        {nombrePeriodo({ ...a.periodo, frecuenciaPago: p.empleado?.frecuenciaPago })}
                      </Link>
                    </Td>
                    <Td>{date(a.periodo.fechaPago)}</Td>
                    <Td className="tabular text-right font-medium">{money(a.monto)}</Td>
                    <Td>
                      <EstadoBadge estado={a.estadoNomina} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
        <Card>
          <CardHeader title="Detalle" />
          <dl className="divide-y divide-slate-100 px-5 py-1">
            <InfoRow label="Monto total">{money(p.montoTotal)}</InfoRow>
            <InfoRow label="Fecha">{date(p.fechaSolicitud)}</InfoRow>
            <InfoRow label="Observación">
              <span className="whitespace-pre-line">{p.observacion}</span>
            </InfoRow>
          </dl>
        </Card>
      </div>

      <CambiarCuotaModal open={modal === 'cuota'} onClose={() => setModal(null)} prestamo={p} onDone={invalidar} />
      <CancelarModal open={modal === 'cancelar'} onClose={() => setModal(null)} prestamo={p} onDone={invalidar} />
      <ConfirmDialog
        open={modal === 'eliminar'}
        onClose={() => setModal(null)}
        onConfirm={() => eliminar.mutate()}
        loading={eliminar.isPending}
        title="Eliminar préstamo"
        confirmText="Eliminar"
        variant="danger"
      >
        <p>El préstamo se eliminará por completo. Úselo solo si se registró por error.</p>
      </ConfirmDialog>
    </>
  );
}

const cuotaSchema = z.object({
  montoCuota: z.number({ error: 'Ingrese la cuota' }).positive('Debe ser mayor a 0'),
  observacion: z.string().max(500).optional(),
});

function CambiarCuotaModal({
  open,
  onClose,
  prestamo,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  prestamo: PrestamoDetalle;
  onDone: () => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof cuotaSchema>>({
    resolver: zodResolver(cuotaSchema),
    values: { montoCuota: prestamo.montoCuota, observacion: prestamo.observacion ?? '' },
  });
  const guardar = useMutation({
    mutationFn: (data: z.infer<typeof cuotaSchema>) => api.patch(`/prestamos/${prestamo.id}`, data),
    onSuccess: () => {
      toast.success('Préstamo actualizado');
      onDone();
      onClose();
    },
  });
  return (
    <Modal open={open} onClose={onClose} title="Cambiar cuota" description={`Saldo pendiente: ${money(prestamo.saldoPendiente)}`}>
      <form onSubmit={handleSubmit((d) => guardar.mutate(d))} className="space-y-4" noValidate>
        <Field label="Nueva cuota por pago (Q)" error={errors.montoCuota?.message}>
          {(id) => (
            <Input
              id={id}
              type="number"
              step="0.01"
              invalid={!!errors.montoCuota}
              {...register('montoCuota', { valueAsNumber: true })}
            />
          )}
        </Field>
        <Field label="Observación">{(id) => <Textarea id={id} {...register('observacion')} />}</Field>
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

function CancelarModal({
  open,
  onClose,
  prestamo,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  prestamo: PrestamoDetalle;
  onDone: () => void;
}) {
  const [motivo, setMotivo] = useState('');
  const cancelar = useMutation({
    mutationFn: () => api.patch(`/prestamos/${prestamo.id}/cancelar`, { motivo }),
    onSuccess: () => {
      toast.success('Préstamo cancelado');
      onDone();
      onClose();
    },
  });
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Cancelar préstamo"
      description="Ya no se descontarán cuotas. El historial se conserva."
    >
      <Field label="Motivo" hint="Ej.: pagó el saldo en efectivo, se condonó la deuda…">
        {(id) => <Textarea id={id} value={motivo} onChange={(e) => setMotivo(e.target.value)} />}
      </Field>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          Volver
        </Button>
        <Button variant="danger" disabled={!motivo.trim()} loading={cancelar.isPending} onClick={() => cancelar.mutate()}>
          Cancelar préstamo
        </Button>
      </ModalFooter>
    </Modal>
  );
}
