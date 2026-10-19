'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ban, CheckCircle2, Plus, Printer, Trash2, X } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { AnularModal, AvisoAnulacion } from '@/components/forms/anular-modal';
import { SelectorMetodoPago } from '@/components/forms/metodo-pago';
import {
  Alert,
  Button,
  Card,
  ConfirmDialog,
  ErrorState,
  EstadoBadge,
  Field,
  Input,
  Modal,
  ModalFooter,
  PageHeader,
  Select,
  Spinner,
} from '@/components/ui';
import { useConceptos, useSesion } from '@/hooks/queries';
import { api } from '@/lib/api';
import { date, dpi, money, nombreCompleto, nombrePeriodo } from '@/lib/format';
import type { Nomina, NominaDetalle } from '@/lib/types';

export function Boleta() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { esAdmin } = useSesion();
  const [agregar, setAgregar] = useState(false);
  const [modal, setModal] = useState<'anular' | 'confirmar' | 'descartar' | null>(null);

  const {
    data: n,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['nominas', Number(id)],
    queryFn: () => api.get<Nomina>(`/nominas/${id}`),
  });

  const quitar = useMutation({
    mutationFn: (detalleId: number) => api.delete<Nomina>(`/nominas/${id}/detalles/${detalleId}`),
    onSuccess: () => {
      toast.success('Línea eliminada');
      queryClient.invalidateQueries({ queryKey: ['nominas', Number(id)] });
      queryClient.invalidateQueries({ queryKey: ['periodos'] });
    },
  });

  // Anular (boleta pagada), confirmar el pago o descartar una boleta nueva sin confirmar.
  const accion = useMutation({
    mutationFn: ({ tipo, motivo }: { tipo: 'anular' | 'confirmar' | 'descartar'; motivo?: string }) =>
      tipo === 'descartar' ? api.delete(`/nominas/${id}`) : api.post(`/nominas/${id}/${tipo}`, motivo ? { motivo } : undefined),
    onSuccess: (_r, { tipo }) => {
      const mensajes = {
        anular: 'Boleta anulada. Los adelantos y préstamos del empleado volvieron a como estaban.',
        confirmar: 'Pago confirmado.',
        descartar: 'Boleta descartada.',
      };
      toast.success(mensajes[tipo]);
      queryClient.invalidateQueries();
      if (tipo === 'descartar') router.push(`/periodos/${n?.periodoId}`);
    },
    onSettled: () => setModal(null),
  });

  if (isLoading) return <Spinner />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  if (!n || !n.periodo || !n.empleado) return null;

  // Boleta nueva emitida en un período ya pagado (tras anular la anterior), pendiente de confirmar.
  const esNuevaPorConfirmar = n.estado === 'GENERADA' && n.periodo.estado === 'CERRADO';
  const editable = n.estado === 'GENERADA' && (n.periodo.estado === 'PROCESADO' || esNuevaPorConfirmar);
  const anulable = esAdmin && n.estado === 'PAGADA' && n.periodo.estado === 'CERRADO';
  // Forma de pago: se cambia antes de confirmar el pago; ya pagada, solo el administrador.
  const puedeCambiarPago = n.estado === 'GENERADA' || (n.estado === 'PAGADA' && esAdmin);
  const percepciones = n.detalles?.filter((d) => d.concepto.tipo === 'PERCEPCION') ?? [];
  const deducciones = n.detalles?.filter((d) => d.concepto.tipo === 'DEDUCCION') ?? [];
  const periodo = { ...n.periodo, frecuenciaPago: n.periodo.frecuenciaPago ?? n.empleado.frecuenciaPago };

  return (
    <>
      <PageHeader
        back={{ href: `/periodos/${n.periodoId}`, label: nombrePeriodo(periodo) }}
        title="Boleta de pago"
        actions={
          <>
            {editable && (
              <Button variant="secondary" onClick={() => setAgregar(true)}>
                <Plus className="size-4" /> Bono / descuento
              </Button>
            )}
            <Button variant="secondary" onClick={() => window.print()}>
              <Printer className="size-4" /> Imprimir
            </Button>
            {anulable && (
              <Button variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => setModal('anular')}>
                <Ban className="size-4" /> Anular boleta
              </Button>
            )}
            {esNuevaPorConfirmar && (
              <>
                <Button variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => setModal('descartar')}>
                  <X className="size-4" /> Descartar
                </Button>
                {esAdmin && (
                  <Button onClick={() => setModal('confirmar')} disabled={n.liquidoRecibir < 0}>
                    <CheckCircle2 className="size-4" /> Confirmar pago
                  </Button>
                )}
              </>
            )}
          </>
        }
      />

      <div className="no-print mx-auto mb-4 max-w-3xl space-y-3 empty:hidden">
        {n.estado === 'ANULADA' && <AvisoAnulacion texto="Esta boleta fue anulada" anulacion={n} />}
        {esNuevaPorConfirmar && (
          <Alert color="amber">
            Boleta nueva que reemplaza a una anulada. Revise los montos (puede agregar bonos o descuentos) y
            {esAdmin ? ' confirme el pago.' : ' pida a un administrador que confirme el pago.'}
          </Alert>
        )}
      </div>

      <Card className="print-full relative mx-auto max-w-3xl overflow-hidden p-6 sm:p-8">
        {n.estado === 'ANULADA' && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 flex items-center justify-center text-6xl font-black tracking-widest text-red-500/15 sm:text-8xl"
            style={{ transform: 'rotate(-20deg)' }}
          >
            ANULADA
          </div>
        )}
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase">Boleta de pago</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-900">{nombreCompleto(n.empleado)}</h2>
            <p className="text-sm text-slate-500">
              DPI {dpi(n.empleado.dpi)} · {n.empleado.puesto?.nombre}
            </p>
          </div>
          <div className="text-sm sm:text-right">
            <p className="font-medium text-slate-900">{nombrePeriodo(periodo)}</p>
            <p className="text-slate-500">
              Del {date(n.periodo.fechaInicio)} al {date(n.periodo.fechaFin)}
            </p>
            <p className="text-slate-500">Fecha de pago: {date(n.periodo.fechaPago)}</p>
            <div className="mt-1">
              <EstadoBadge estado={n.estado} />
            </div>
          </div>
        </div>

        <div className="grid gap-8 py-6 sm:grid-cols-2">
          <Seccion titulo="Percepciones" lineas={percepciones} editable={editable} onQuitar={(d) => quitar.mutate(d)} />
          <Seccion titulo="Deducciones" lineas={deducciones} editable={editable} onQuitar={(d) => quitar.mutate(d)} negativo />
        </div>

        <div className="space-y-1 border-t border-slate-200 pt-5 text-sm">
          <Fila label="Total percepciones" valor={money(n.totalPercepciones)} />
          <Fila label="Total deducciones" valor={`− ${money(n.totalDeducciones)}`} />
          <div className="mt-3 flex items-center justify-between rounded-lg bg-slate-900 px-4 py-3 text-white">
            <span className="font-medium">Líquido a recibir</span>
            <span className="tabular text-xl font-semibold">{money(n.liquidoRecibir)}</span>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm">
          <span className="text-slate-500">Forma de pago</span>
          {/* En pantalla se puede cambiar; impresa muestra solo el texto. */}
          {puedeCambiarPago ? (
            <span className="no-print">
              <SelectorMetodoPago nomina={n} empleado={n.empleado} />
            </span>
          ) : null}
          <span className={`font-medium text-slate-900 ${puedeCambiarPago ? 'hidden print:inline' : ''}`}>
            {n.metodoPago === 'DEPOSITO' ? `Depósito a ${n.bancoDestino ?? '—'}, cuenta ${n.numeroCuenta ?? '—'}` : 'Efectivo'}
          </span>
        </div>

        {/* Solo en papel: espacio para la firma del empleado */}
        <div className="mt-16 hidden w-64 border-t border-slate-400 pt-2 text-center text-xs text-slate-600 print:block">
          Firma del empleado
        </div>
      </Card>

      <AnularModal
        open={modal === 'anular'}
        onClose={() => setModal(null)}
        onConfirmar={(motivo) => accion.mutate({ tipo: 'anular', motivo })}
        loading={accion.isPending}
        titulo="Anular boleta"
      >
        <p>
          Se anulará el pago de <strong>{nombreCompleto(n.empleado)}</strong> ({money(n.liquidoRecibir)}). Los demás empleados del
          período no se modifican.
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Sus adelantos descontados vuelven a quedar pendientes.</li>
          <li>Sus préstamos recuperan el saldo de la cuota descontada.</li>
          <li>La boleta queda como ANULADA (no se borra) y podrá emitir una boleta nueva desde el período.</li>
        </ul>
      </AnularModal>
      <ConfirmDialog
        open={modal === 'confirmar'}
        onClose={() => setModal(null)}
        onConfirm={() => accion.mutate({ tipo: 'confirmar' })}
        loading={accion.isPending}
        title="Confirmar pago"
        confirmText={`Confirmar pago de ${money(n.liquidoRecibir)}`}
      >
        <p>Los adelantos de esta boleta quedarán como descontados y se rebajará el saldo de sus préstamos.</p>
      </ConfirmDialog>
      <ConfirmDialog
        open={modal === 'descartar'}
        onClose={() => setModal(null)}
        onConfirm={() => accion.mutate({ tipo: 'descartar' })}
        loading={accion.isPending}
        title="Descartar boleta nueva"
        confirmText="Descartar"
        variant="danger"
      >
        <p>La boleta nueva se eliminará. El empleado seguirá con su boleta anulada en este período.</p>
      </ConfirmDialog>
      <AgregarLineaModal open={agregar} onClose={() => setAgregar(false)} nominaId={n.id} />
    </>
  );
}

function Seccion({
  titulo,
  lineas,
  editable,
  onQuitar,
  negativo,
}: {
  titulo: string;
  lineas: NominaDetalle[];
  editable: boolean;
  onQuitar: (detalleId: number) => void;
  negativo?: boolean;
}) {
  return (
    <div className="min-w-0">
      <h3 className="mb-2 text-sm font-semibold text-slate-900">{titulo}</h3>
      {lineas.length === 0 ? (
        <p className="text-sm text-slate-400">Ninguna</p>
      ) : (
        <ul className="divide-y divide-slate-100 text-sm">
          {lineas.map((d) => (
            <li key={d.id} className="flex items-start justify-between gap-3 py-2">
              <div className="min-w-0">
                <p className="text-slate-800">{d.concepto.nombre}</p>
                {d.observacion && <p className="truncate text-xs text-slate-500">{d.observacion}</p>}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <span className={`tabular font-medium ${negativo ? 'text-red-700' : 'text-slate-900'}`}>{money(d.monto)}</span>
                {editable && !d.concepto.esSistema && (
                  <button
                    onClick={() => onQuitar(d.id)}
                    className="no-print rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    aria-label={`Quitar ${d.concepto.nombre}`}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Fila({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="flex justify-between text-slate-600">
      <span>{label}</span>
      <span className="tabular">{valor}</span>
    </div>
  );
}

const lineaSchema = z.object({
  conceptoId: z.number().int().positive('Seleccione un concepto'),
  monto: z.number({ error: 'Ingrese el monto' }).positive('Debe ser mayor a 0'),
  observacion: z.string().max(500).optional(),
});
type LineaForm = z.infer<typeof lineaSchema>;

function AgregarLineaModal({ open, onClose, nominaId }: { open: boolean; onClose: () => void; nominaId: number }) {
  const queryClient = useQueryClient();
  const conceptos = useConceptos();
  const manuales = conceptos.data?.filter((c) => !c.esSistema && c.activo) ?? [];
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LineaForm>({ resolver: zodResolver(lineaSchema), defaultValues: { conceptoId: 0, observacion: '' } });

  const guardar = useMutation({
    mutationFn: (data: LineaForm) => api.post<Nomina>(`/nominas/${nominaId}/detalles`, data),
    onSuccess: () => {
      toast.success('Línea agregada');
      queryClient.invalidateQueries({ queryKey: ['nominas', nominaId] });
      queryClient.invalidateQueries({ queryKey: ['periodos'] });
      reset();
      onClose();
    },
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Agregar bono o descuento"
      description="Los conceptos se administran en Catálogos."
    >
      <form onSubmit={handleSubmit((d) => guardar.mutate(d))} className="space-y-4" noValidate>
        <Field label="Concepto" error={errors.conceptoId?.message}>
          {(id) => (
            <Select id={id} invalid={!!errors.conceptoId} {...register('conceptoId', { valueAsNumber: true })}>
              <option value={0}>Seleccione…</option>
              <optgroup label="Suman (percepciones)">
                {manuales
                  .filter((c) => c.tipo === 'PERCEPCION')
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
              </optgroup>
              <optgroup label="Restan (deducciones)">
                {manuales
                  .filter((c) => c.tipo === 'DEDUCCION')
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
              </optgroup>
            </Select>
          )}
        </Field>
        <Field label="Monto (Q)" error={errors.monto?.message}>
          {(id) => (
            <Input
              id={id}
              type="number"
              step="0.01"
              min="0"
              invalid={!!errors.monto}
              {...register('monto', { valueAsNumber: true })}
            />
          )}
        </Field>
        <Field label="Detalle (opcional)">
          {(id) => <Input id={id} placeholder="Ej.: bono por puntualidad" {...register('observacion')} />}
        </Field>
        <ModalFooter>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={guardar.isPending}>
            Agregar
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
