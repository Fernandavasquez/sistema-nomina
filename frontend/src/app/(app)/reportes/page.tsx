'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { Banknote, CalendarRange, FileBarChart, HandCoins, Users } from 'lucide-react';
import { useState } from 'react';
import { BotonesDescarga } from '@/components/botones-descarga';
import {
  Alert,
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  Field,
  Input,
  PageHeader,
  Select,
  Spinner,
  Table,
  Td,
  Th,
} from '@/components/ui';
import { useSesion } from '@/hooks/queries';
import { api, qs } from '@/lib/api';
import { date, dateTime, money, nombrePeriodo, today } from '@/lib/format';
import type { PeriodoNomina, Reporte, ReporteColumna, ReporteTabla } from '@/lib/types';

type TipoReporte = 'planilla' | 'pagos' | 'adelantos' | 'prestamos' | 'empleados';

const REPORTES: { tipo: TipoReporte; titulo: string; descripcion: string; icono: typeof Users }[] = [
  {
    tipo: 'planilla',
    titulo: 'Planilla del período',
    descripcion: 'Lo que se paga a cada empleado en una semana o quincena, con totales por banco.',
    icono: CalendarRange,
  },
  {
    tipo: 'pagos',
    titulo: 'Pagos por fechas',
    descripcion: 'Total pagado a cada empleado en un mes, trimestre o año.',
    icono: FileBarChart,
  },
  { tipo: 'adelantos', titulo: 'Adelantos', descripcion: 'Adelantos entregados, pendientes o ya descontados.', icono: HandCoins },
  { tipo: 'prestamos', titulo: 'Cartera de préstamos', descripcion: 'Prestado, pagado y saldo por cobrar.', icono: Banknote },
  { tipo: 'empleados', titulo: 'Listado de empleados', descripcion: 'Datos, salario y cuenta bancaria.', icono: Users },
];

export default function ReportesPage() {
  const { esAdmin, isLoading } = useSesion();
  const [tipo, setTipo] = useState<TipoReporte>('planilla');

  if (isLoading) return <Spinner />;
  if (!esAdmin) return <Alert color="red">Los reportes son solo para administradores.</Alert>;

  return (
    <>
      <PageHeader title="Reportes" description="Consulte la información y descárguela en Excel o PDF." />
      <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
        <nav aria-label="Tipo de reporte" className="no-print">
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
            {REPORTES.map(({ tipo: t, titulo, descripcion, icono: Icono }) => (
              <li key={t}>
                <button
                  onClick={() => setTipo(t)}
                  aria-current={tipo === t ? 'true' : undefined}
                  className={clsx(
                    'flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors',
                    tipo === t ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white hover:bg-slate-50',
                  )}
                >
                  <Icono className={clsx('mt-0.5 size-5 shrink-0', tipo === t ? 'text-emerald-600' : 'text-slate-400')} />
                  <span>
                    <span className="block text-sm font-medium text-slate-900">{titulo}</span>
                    <span className="block text-xs text-slate-500">{descripcion}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </nav>
        {/* key: al cambiar de reporte, sus filtros empiezan de nuevo */}
        <ReporteSeleccionado key={tipo} tipo={tipo} />
      </div>
    </>
  );
}

// ───────────────────────── Filtros de cada reporte ─────────────────────────

function primerDiaDelMes() {
  return `${today().slice(0, 8)}01`;
}

function ReporteSeleccionado({ tipo }: { tipo: TipoReporte }) {
  const [periodoId, setPeriodoId] = useState('');
  const [desde, setDesde] = useState(primerDiaDelMes);
  const [hasta, setHasta] = useState(today);
  const [estado, setEstado] = useState(tipo === 'prestamos' || tipo === 'empleados' ? 'ACTIVO' : '');

  const periodos = useQuery({
    queryKey: ['periodos', {}],
    queryFn: () => api.get<PeriodoNomina[]>('/periodos-nomina'),
    enabled: tipo === 'planilla',
  });
  // Por defecto, el período más reciente que ya tiene nóminas calculadas.
  const periodoElegido = periodoId || String(periodos.data?.find((p) => p.estado !== 'ABIERTO')?.id ?? '');

  const ruta: string | null = {
    planilla: periodoElegido ? `/reportes/planilla/${periodoElegido}` : null,
    pagos: `/reportes/pagos${qs({ desde, hasta })}`,
    adelantos: `/reportes/adelantos${qs({ desde, hasta, estado })}`,
    prestamos: `/reportes/prestamos${qs({ estado })}`,
    empleados: `/reportes/empleados${qs({ estado })}`,
  }[tipo];

  const rangoInvalido = (tipo === 'pagos' || tipo === 'adelantos') && desde > hasta;

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {tipo === 'planilla' && (
            <Field label="Período" className="sm:col-span-2">
              {(id) => (
                <Select id={id} value={periodoElegido} onChange={(e) => setPeriodoId(e.target.value)}>
                  {!periodos.data?.length && <option value="">{periodos.isLoading ? 'Cargando…' : 'No hay períodos'}</option>}
                  {periodos.data?.map((p) => (
                    <option key={p.id} value={p.id}>
                      {nombrePeriodo(p)} · {date(p.fechaInicio)} – {date(p.fechaFin)} ·{' '}
                      {p.estado === 'CERRADO'
                        ? 'Pagado'
                        : p.estado === 'PROCESADO'
                          ? 'En revisión'
                          : p.estado === 'ANULADO'
                            ? 'Anulado'
                            : 'Abierto'}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          )}

          {(tipo === 'pagos' || tipo === 'adelantos') && (
            <>
              <Field label="Desde">
                {(id) => <Input id={id} type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />}
              </Field>
              <Field label="Hasta">
                {(id) => <Input id={id} type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />}
              </Field>
              <RangosRapidos
                onElegir={(d, h) => {
                  setDesde(d);
                  setHasta(h);
                }}
              />
            </>
          )}

          {tipo === 'adelantos' && (
            <Field label="Estado">
              {(id) => (
                <Select id={id} value={estado} onChange={(e) => setEstado(e.target.value)}>
                  <option value="">Todos</option>
                  <option value="PENDIENTE">Pendientes</option>
                  <option value="DESCONTADO">Descontados</option>
                </Select>
              )}
            </Field>
          )}

          {tipo === 'prestamos' && (
            <Field label="Estado">
              {(id) => (
                <Select id={id} value={estado} onChange={(e) => setEstado(e.target.value)}>
                  <option value="ACTIVO">Activos</option>
                  <option value="PAGADO">Pagados</option>
                  <option value="CANCELADO">Cancelados</option>
                  <option value="">Todos</option>
                </Select>
              )}
            </Field>
          )}

          {tipo === 'empleados' && (
            <Field label="Estado">
              {(id) => (
                <Select id={id} value={estado} onChange={(e) => setEstado(e.target.value)}>
                  <option value="ACTIVO">Activos</option>
                  <option value="INACTIVO">Inactivos</option>
                  <option value="">Todos</option>
                </Select>
              )}
            </Field>
          )}
        </div>
      </Card>

      {rangoInvalido ? (
        <Alert color="red">La fecha &quot;desde&quot; no puede ser posterior a &quot;hasta&quot;.</Alert>
      ) : tipo === 'planilla' && !periodos.isLoading && !ruta ? (
        <Card>
          <EmptyState title="Aún no hay períodos" description="Cree y calcule un período en Períodos y nóminas." />
        </Card>
      ) : (
        ruta && <VistaPrevia ruta={ruta} />
      )}
    </div>
  );
}

/** Atajos para los rangos de fechas más usados. */
function RangosRapidos({ onElegir }: { onElegir: (desde: string, hasta: string) => void }) {
  const hoy = today();
  const [y, m] = hoy.split('-').map(Number);
  const iso = (a: number, mes: number, d: number) => `${a}-${String(mes).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const ultimoDia = (a: number, mes: number) => new Date(Date.UTC(a, mes, 0)).getUTCDate();
  const [ya, ma] = m === 1 ? [y - 1, 12] : [y, m - 1];

  const opciones: [string, string, string][] = [
    ['Este mes', iso(y, m, 1), hoy],
    ['Mes anterior', iso(ya, ma, 1), iso(ya, ma, ultimoDia(ya, ma))],
    ['Este año', iso(y, 1, 1), hoy],
  ];
  return (
    <div className="flex flex-wrap items-end gap-1.5 sm:col-span-2">
      {opciones.map(([texto, d, h]) => (
        <button
          key={texto}
          type="button"
          onClick={() => onElegir(d, h)}
          className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-600 hover:bg-slate-50"
        >
          {texto}
        </button>
      ))}
    </div>
  );
}

// ───────────────────────── Vista previa ─────────────────────────

function VistaPrevia({ ruta }: { ruta: string }) {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['reportes', ruta],
    queryFn: () => api.get<Reporte>(ruta),
    placeholderData: keepPreviousData,
  });

  if (isLoading) return <Spinner label="Generando reporte…" />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  if (!data) return null;

  return (
    <div className={clsx('space-y-4 transition-opacity', isFetching && 'opacity-60')}>
      <Card>
        <CardHeader title={data.titulo} description={data.subtitulo} actions={<BotonesDescarga ruta={ruta} />} />
        {data.resumen && (
          <dl className="grid gap-px border-b border-slate-200 bg-slate-200 sm:grid-cols-2 xl:grid-cols-4">
            {data.resumen.map((r) => (
              <div key={r.etiqueta} className="bg-white px-5 py-3">
                <dt className="text-xs text-slate-500">{r.etiqueta}</dt>
                <dd className="tabular mt-0.5 text-lg font-semibold text-slate-900">{r.valor}</dd>
              </div>
            ))}
          </dl>
        )}
        <TablaReporte tabla={data} />
        <p className="px-5 py-3 text-xs text-slate-400">
          {data.filas.length} registro(s) · Generado el {dateTime(data.generado)}
        </p>
      </Card>
      {data.anexos?.map((anexo) => (
        <Card key={anexo.titulo}>
          {anexo.titulo && <CardHeader title={anexo.titulo} />}
          <TablaReporte tabla={anexo} />
        </Card>
      ))}
    </div>
  );
}

function valorCelda(valor: string | number | null | undefined, columna: ReporteColumna) {
  if (valor === null || valor === undefined || valor === '') return '—';
  if (columna.tipo === 'dinero') return money(Number(valor));
  if (columna.tipo === 'fecha') return date(String(valor));
  return String(valor);
}

function TablaReporte({ tabla }: { tabla: ReporteTabla }) {
  if (!tabla.filas.length) return <EmptyState title="Sin datos para los filtros elegidos" />;
  const derecha = (c: ReporteColumna) => c.tipo === 'dinero' || c.tipo === 'numero';
  return (
    <Table>
      <thead>
        <tr>
          {tabla.columnas.map((c) => (
            <Th key={c.clave} className={derecha(c) ? 'text-right' : undefined}>
              {c.titulo}
            </Th>
          ))}
        </tr>
      </thead>
      <tbody>
        {tabla.filas.map((fila, i) => (
          <tr key={i} className="hover:bg-slate-50">
            {tabla.columnas.map((c) => (
              <Td key={c.clave} className={clsx('whitespace-nowrap', derecha(c) && 'tabular text-right')}>
                {valorCelda(fila[c.clave], c)}
              </Td>
            ))}
          </tr>
        ))}
      </tbody>
      {tabla.totales && (
        <tfoot>
          <tr className="bg-slate-50 font-semibold">
            {tabla.columnas.map((c, i) => (
              <Td key={c.clave} className={clsx('whitespace-nowrap', derecha(c) && 'tabular text-right')}>
                {i === 0 ? 'Total' : tabla.totales?.[c.clave] !== undefined ? valorCelda(tabla.totales[c.clave], c) : ''}
              </Td>
            ))}
          </tr>
        </tfoot>
      )}
    </Table>
  );
}
