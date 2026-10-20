'use client';

import { useQuery } from '@tanstack/react-query';
import { Banknote, CalendarRange, HandCoins, Plus, Users } from 'lucide-react';
import Link from 'next/link';
import {
  ButtonLink,
  Card,
  CardHeader,
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
import { useEmpresaActual, useSesion } from '@/hooks/queries';
import { api } from '@/lib/api';
import { date, money, nombrePeriodo } from '@/lib/format';
import type { DashboardResumen } from '@/lib/types';

export function DashboardView() {
  const { usuario } = useSesion();
  const { empresa, varias } = useEmpresaActual();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get<DashboardResumen>('/dashboard/resumen'),
  });

  return (
    <>
      <PageHeader
        title={usuario ? `Hola, ${usuario.nombre}` : 'Inicio'}
        description={
          empresa ? `Resumen de ${empresa.nombre}` : varias ? 'Resumen de todas las empresas' : 'Resumen general de la nómina'
        }
        actions={
          <>
            <ButtonLink href="/empleados/nuevo" variant="secondary">
              <Plus className="size-4" /> Empleado
            </ButtonLink>
            <ButtonLink href="/periodos">
              <CalendarRange className="size-4" /> Ir a pagos
            </ButtonLink>
          </>
        }
      />

      {isLoading && <Spinner />}
      {error && <ErrorState error={error} onRetry={refetch} />}
      {data && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat
              label="Empleados activos"
              value={data.empleadosActivos}
              icon={<Users className="size-5" />}
              hint={
                data.empleadosPorFrecuencia.map((f) => `${f.empleados} ${f.frecuencia.toLowerCase()}`).join(' · ') ||
                'Sin empleados'
              }
            />
            <Stat
              label="Planilla por período"
              value={money(data.empleadosPorFrecuencia.reduce((s, f) => s + f.totalSalarios, 0))}
              icon={<CalendarRange className="size-5" />}
              hint={`Una semana + una quincena · planilla mensual ${money(data.empleadosPorFrecuencia.reduce((s, f) => s + f.totalMensual, 0))}`}
            />
            <Stat
              label="Adelantos por descontar"
              value={money(data.adelantosPendientes.total)}
              icon={<HandCoins className="size-5" />}
              hint={`${data.adelantosPendientes.cantidad} adelanto(s) pendiente(s)`}
            />
            <Stat
              label="Saldo de préstamos"
              value={money(data.prestamosActivos.saldo)}
              icon={<Banknote className="size-5" />}
              hint={`${data.prestamosActivos.cantidad} préstamo(s) activo(s)`}
            />
          </div>

          {!empresa && data.porEmpresa.length > 1 && (
            <Card>
              <CardHeader title="Por empresa" description="Empleados activos y lo que se paga a cada empresa" />
              <Table>
                <thead>
                  <tr>
                    <Th>Empresa</Th>
                    <Th className="text-right">Empleados activos</Th>
                    <Th className="text-right">Planilla por período</Th>
                    <Th className="text-right">Planilla mensual</Th>
                  </tr>
                </thead>
                <tbody>
                  {data.porEmpresa.map((e) => (
                    <tr key={e.empresaId}>
                      <Td className="font-medium text-slate-900">{e.nombre}</Td>
                      <Td className="tabular text-right">{e.empleados}</Td>
                      <Td className="tabular text-right">{money(e.totalPorPeriodo)}</Td>
                      <Td className="tabular text-right font-medium">{money(e.totalMensual)}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader title="Pagos pendientes" description="Períodos abiertos o en revisión" />
              {data.periodosPendientes.length === 0 ? (
                <EmptyState
                  title="No hay pagos pendientes"
                  description="Cree el siguiente período cuando se acerque la fecha de pago."
                  action={
                    <ButtonLink href="/periodos" size="sm">
                      Crear período
                    </ButtonLink>
                  }
                />
              ) : (
                <ul className="divide-y divide-slate-100">
                  {data.periodosPendientes.map((p) => (
                    <li key={p.id}>
                      <Link
                        href={`/periodos/${p.id}`}
                        className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50"
                      >
                        <div>
                          <p className="text-sm font-medium text-slate-900">{nombrePeriodo(p)}</p>
                          <p className="text-xs text-slate-500">
                            {!empresa && varias && `${p.empresa.nombre} · `}
                            {date(p.fechaInicio)} – {date(p.fechaFin)} · pago {date(p.fechaPago)}
                          </p>
                        </div>
                        <EstadoBadge estado={p.estado} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card>
              <CardHeader title="Últimos pagos realizados" />
              {data.ultimosPagos.length === 0 ? (
                <EmptyState title="Aún no se ha cerrado ningún pago" />
              ) : (
                <Table>
                  <thead>
                    <tr>
                      <Th>Período</Th>
                      <Th>Fecha de pago</Th>
                      <Th className="text-right">Empleados</Th>
                      <Th className="text-right">Total pagado</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.ultimosPagos.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <Td>
                          <Link href={`/periodos/${p.id}`} className="font-medium text-slate-900 hover:text-emerald-700">
                            {nombrePeriodo({ ...p, frecuenciaPago: { nombre: p.frecuencia } })}
                          </Link>
                          {!empresa && varias && <p className="text-xs text-slate-500">{p.empresa}</p>}
                        </Td>
                        <Td>{date(p.fechaPago)}</Td>
                        <Td className="tabular text-right">{p.empleados}</Td>
                        <Td className="tabular text-right font-medium">{money(p.totalPagado)}</Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
