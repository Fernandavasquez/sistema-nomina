'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  Alert,
  Button,
  Card,
  EmptyState,
  ErrorState,
  EstadoBadge,
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
import { useEmpresaActual, useFrecuencias } from '@/hooks/queries';
import { api, qs } from '@/lib/api';
import { date, nombrePeriodo } from '@/lib/format';
import type { PeriodoNomina } from '@/lib/types';

export default function PeriodosPage() {
  // Con "Todas las empresas" se muestra de qué empresa es cada período.
  const { seleccion: empresaMenu, varias } = useEmpresaActual();
  const verEmpresa = varias && empresaMenu === 'todas';
  const router = useRouter();
  const frecuencias = useFrecuencias();
  const [frecuenciaPagoId, setFrecuenciaPagoId] = useState('');
  const [estado, setEstado] = useState('');
  const [nuevo, setNuevo] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['periodos', { frecuenciaPagoId, estado }],
    queryFn: () => api.get<PeriodoNomina[]>(`/periodos-nomina${qs({ frecuenciaPagoId, estado })}`),
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <PageHeader
        title="Períodos y nóminas"
        description="Cada período agrupa el pago de una semana o una quincena."
        actions={
          <Button onClick={() => setNuevo(true)}>
            <Plus className="size-4" /> Nuevo período
          </Button>
        }
      />

      <ol className="mb-6 grid gap-3 text-sm sm:grid-cols-3">
        {[
          ['1. Crear', 'Elija semanal o quincenal; las fechas se calculan solas.'],
          ['2. Procesar y revisar', 'El sistema calcula sueldo, adelantos y préstamos. Puede agregar bonos.'],
          ['3. Cerrar', 'Confirma el pago: descuenta los adelantos y rebaja los préstamos.'],
        ].map(([t, d]) => (
          <li key={t} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <p className="font-medium text-slate-900">{t}</p>
            <p className="mt-0.5 text-slate-500">{d}</p>
          </li>
        ))}
      </ol>

      <Card>
        <div className="grid gap-3 border-b border-slate-200 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <Select value={frecuenciaPagoId} onChange={(e) => setFrecuenciaPagoId(e.target.value)} aria-label="Frecuencia">
            <option value="">Semanal y quincenal</option>
            {frecuencias.data?.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nombre}
              </option>
            ))}
          </Select>
          <Select value={estado} onChange={(e) => setEstado(e.target.value)} aria-label="Estado">
            <option value="">Todos los estados</option>
            <option value="ABIERTO">Abiertos</option>
            <option value="PROCESADO">En revisión (procesados)</option>
            <option value="CERRADO">Cerrados (pagados)</option>
            <option value="ANULADO">Anulados</option>
          </Select>
        </div>
        {isLoading ? (
          <Spinner />
        ) : error ? (
          <div className="p-4">
            <ErrorState error={error} onRetry={refetch} />
          </div>
        ) : !data?.length ? (
          <EmptyState title="No hay períodos" description="Cree el primer período para calcular la nómina." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Período</Th>
                {verEmpresa && <Th>Empresa</Th>}
                <Th>Del</Th>
                <Th>Al</Th>
                <Th>Fecha de pago</Th>
                <Th>Estado</Th>
              </tr>
            </thead>
            <tbody>
              {data.map((p) => (
                <tr key={p.id} onClick={() => router.push(`/periodos/${p.id}`)} className="cursor-pointer hover:bg-slate-50">
                  <Td className="font-medium text-slate-900">{nombrePeriodo(p)}</Td>
                  {verEmpresa && <Td className="text-slate-600">{p.empresa.nombre}</Td>}
                  <Td>{date(p.fechaInicio)}</Td>
                  <Td>{date(p.fechaFin)}</Td>
                  <Td>{date(p.fechaPago)}</Td>
                  <Td>
                    <EstadoBadge estado={p.estado} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
      <NuevoPeriodoModal open={nuevo} onClose={() => setNuevo(false)} />
    </>
  );
}

function NuevoPeriodoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const frecuencias = useFrecuencias();
  const { seleccion, empresas, varias } = useEmpresaActual();
  // Cada empresa lleva sus propios períodos: por defecto, la elegida en el menú.
  const [empresaElegida, setEmpresaElegida] = useState(0);
  const empresaId = empresaElegida || (seleccion === 'todas' ? 0 : seleccion);
  const [frecuenciaPagoId, setFrecuenciaPagoId] = useState(0);
  // Fechas que el usuario modificó a mano; las demás se toman de la sugerencia.
  const [cambios, setCambios] = useState<Partial<Record<'fechaInicio' | 'fechaFin' | 'fechaPago', string>>>({});

  // Al elegir la frecuencia, el backend sugiere las fechas que siguen al último período.
  const sugerencia = useQuery({
    queryKey: ['periodos', 'sugerencia', empresaId, frecuenciaPagoId],
    queryFn: () =>
      api.get<{ fechaInicio: string; fechaFin: string; fechaPago: string }>(
        `/periodos-nomina/sugerencia${qs({ frecuenciaPagoId, empresaId })}`,
      ),
    enabled: open && frecuenciaPagoId > 0 && empresaId > 0,
    staleTime: 0,
  });
  const fechas = { fechaInicio: '', fechaFin: '', fechaPago: '', ...sugerencia.data, ...cambios };
  const setFechas = (f: typeof fechas) => setCambios(f);

  const crear = useMutation({
    mutationFn: () =>
      api.post<PeriodoNomina>('/periodos-nomina', {
        empresaId,
        frecuenciaPagoId,
        fechaInicio: fechas.fechaInicio,
        fechaFin: fechas.fechaFin,
        fechaPago: fechas.fechaPago,
      }),
    onSuccess: (p) => {
      toast.success('Período creado');
      queryClient.invalidateQueries({ queryKey: ['periodos'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      router.push(`/periodos/${p.id}`);
    },
  });

  return (
    <Modal open={open} onClose={onClose} title="Nuevo período de pago">
      <div className="space-y-4">
        {varias && (
          <Field label="Empresa">
            {(id) => (
              <Select
                id={id}
                value={empresaId}
                onChange={(e) => {
                  setEmpresaElegida(Number(e.target.value));
                  setCambios({});
                }}
              >
                <option value={0}>Seleccione…</option>
                {empresas.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nombre}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        )}
        <Field label="Forma de pago">
          {(id) => (
            <Select
              id={id}
              value={frecuenciaPagoId}
              onChange={(e) => {
                setFrecuenciaPagoId(Number(e.target.value));
                setCambios({});
              }}
            >
              <option value={0}>Seleccione…</option>
              {frecuencias.data?.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nombre}
                </option>
              ))}
            </Select>
          )}
        </Field>
        {frecuenciaPagoId > 0 && empresaId > 0 && (
          <>
            <Alert color="blue">Fechas sugeridas a continuación del último período. Puede ajustarlas si lo necesita.</Alert>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Desde">
                {(id) => (
                  <Input
                    id={id}
                    type="date"
                    value={fechas.fechaInicio}
                    onChange={(e) => setFechas({ ...fechas, fechaInicio: e.target.value })}
                  />
                )}
              </Field>
              <Field label="Hasta">
                {(id) => (
                  <Input
                    id={id}
                    type="date"
                    value={fechas.fechaFin}
                    onChange={(e) => setFechas({ ...fechas, fechaFin: e.target.value })}
                  />
                )}
              </Field>
              <Field label="Fecha de pago">
                {(id) => (
                  <Input
                    id={id}
                    type="date"
                    value={fechas.fechaPago}
                    onChange={(e) => setFechas({ ...fechas, fechaPago: e.target.value })}
                  />
                )}
              </Field>
            </div>
          </>
        )}
        <ModalFooter>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={() => crear.mutate()}
            loading={crear.isPending}
            disabled={!empresaId || !frecuenciaPagoId || !fechas.fechaInicio || !fechas.fechaFin || sugerencia.isFetching}
          >
            Crear período
          </Button>
        </ModalFooter>
      </div>
    </Modal>
  );
}
