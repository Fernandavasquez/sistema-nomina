'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Plus, Search } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDeferredValue, useState } from 'react';
import {
  ButtonLink,
  Card,
  EmptyState,
  ErrorState,
  EstadoBadge,
  Input,
  PageHeader,
  Select,
  Spinner,
  Table,
  Td,
  Th,
} from '@/components/ui';
import { useEmpresaActual, useFrecuencias, usePuestos } from '@/hooks/queries';
import { api, qs } from '@/lib/api';
import { dpi, money } from '@/lib/format';
import type { Empleado } from '@/lib/types';

export function EmpleadosView() {
  // Con "Todas las empresas" se muestra a qué empresa pertenece cada empleado.
  const { seleccion, varias } = useEmpresaActual();
  const verEmpresa = varias && seleccion === 'todas';
  const router = useRouter();
  const params = useSearchParams();
  const [buscar, setBuscar] = useState('');
  const [estado, setEstado] = useState('ACTIVO');
  const [puestoId, setPuestoId] = useState(params.get('puestoId') ?? '');
  const [frecuenciaPagoId, setFrecuenciaPagoId] = useState('');
  // Espera a que el usuario deje de escribir para no consultar en cada tecla.
  const buscarDiferido = useDeferredValue(buscar);

  const puestos = usePuestos();
  const frecuencias = useFrecuencias();
  const filtros = { buscar: buscarDiferido, estado, puestoId, frecuenciaPagoId };
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['empleados', filtros],
    queryFn: () => api.get<Empleado[]>(`/empleados${qs(filtros)}`),
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <PageHeader
        title="Empleados"
        description="Personal de la empresa, su salario y forma de pago."
        actions={
          <ButtonLink href="/empleados/nuevo">
            <Plus className="size-4" /> Nuevo empleado
          </ButtonLink>
        }
      />

      <Card>
        <div className="grid gap-3 border-b border-slate-200 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative sm:col-span-2 lg:col-span-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Buscar por nombre o DPI"
              className="pl-9"
              value={buscar}
              onChange={(e) => setBuscar(e.target.value)}
              aria-label="Buscar"
            />
          </div>
          <Select value={estado} onChange={(e) => setEstado(e.target.value)} aria-label="Estado">
            <option value="">Todos los estados</option>
            <option value="ACTIVO">Activos</option>
            <option value="INACTIVO">Inactivos</option>
          </Select>
          <Select value={puestoId} onChange={(e) => setPuestoId(e.target.value)} aria-label="Puesto">
            <option value="">Todos los puestos</option>
            {puestos.data?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </Select>
          <Select value={frecuenciaPagoId} onChange={(e) => setFrecuenciaPagoId(e.target.value)} aria-label="Frecuencia de pago">
            <option value="">Semanal y quincenal</option>
            {frecuencias.data?.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nombre}
              </option>
            ))}
          </Select>
        </div>

        {isLoading ? (
          <Spinner />
        ) : error ? (
          <div className="p-4">
            <ErrorState error={error} onRetry={refetch} />
          </div>
        ) : !data?.length ? (
          <EmptyState
            title="No se encontraron empleados"
            description={
              buscar || puestoId || frecuenciaPagoId ? 'Pruebe con otros filtros.' : 'Registre al primer empleado para comenzar.'
            }
          />
        ) : (
          <div className={isFetching ? 'opacity-60 transition-opacity' : ''}>
            <Table>
              <thead>
                <tr>
                  <Th>Empleado</Th>
                  <Th>DPI</Th>
                  {verEmpresa && <Th>Empresa</Th>}
                  <Th>Puesto</Th>
                  <Th>Pago</Th>
                  <Th className="text-right">Salario mensual</Th>
                  <Th>Estado</Th>
                </tr>
              </thead>
              <tbody>
                {data.map((e) => (
                  <tr key={e.id} onClick={() => router.push(`/empleados/${e.id}`)} className="cursor-pointer hover:bg-slate-50">
                    <Td>
                      <p className="font-medium text-slate-900">
                        {e.apellidos}, {e.nombres}
                      </p>
                      {e.telefono && <p className="text-xs text-slate-500">{e.telefono}</p>}
                    </Td>
                    <Td className="tabular whitespace-nowrap text-slate-600">{dpi(e.dpi)}</Td>
                    {verEmpresa && <Td className="text-slate-600">{e.empresa.nombre}</Td>}
                    <Td>{e.puesto.nombre}</Td>
                    <Td>{e.frecuenciaPago.nombre}</Td>
                    <Td className="tabular text-right font-medium">{money(e.salarioMensual)}</Td>
                    <Td>
                      <EstadoBadge estado={e.estado} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <p className="px-4 py-3 text-xs text-slate-500">{data.length} empleado(s)</p>
          </div>
        )}
      </Card>
    </>
  );
}
