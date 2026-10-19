'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Banknote, Landmark } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import type { Empleado, MetodoPago, Nomina } from '@/lib/types';

export function tieneCuenta(empleado?: Pick<Empleado, 'bancoDestino' | 'numeroCuenta'> | null): boolean {
  return !!(empleado?.bancoDestino?.trim() && empleado?.numeroCuenta?.trim());
}

/** Texto de la forma de pago guardada en la boleta: "Efectivo" o "Depósito · Banrural · 0123…". */
export function textoMetodoPago(n: Pick<Nomina, 'metodoPago' | 'bancoDestino' | 'numeroCuenta'>): string {
  return n.metodoPago === 'DEPOSITO' ? `Depósito · ${n.bancoDestino ?? ''} · ${n.numeroCuenta ?? ''}` : 'Efectivo';
}

/** Icono y texto de la forma de pago (sin poder cambiarla). */
export function MetodoPagoTexto({ nomina }: { nomina: Pick<Nomina, 'metodoPago' | 'bancoDestino' | 'numeroCuenta'> }) {
  const deposito = nomina.metodoPago === 'DEPOSITO';
  const Icono = deposito ? Landmark : Banknote;
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icono className={`size-4 shrink-0 ${deposito ? 'text-sky-600' : 'text-emerald-600'}`} />
      <span>
        {deposito ? 'Depósito' : 'Efectivo'}
        {deposito && (
          <span className="block text-xs text-slate-500">
            {nomina.bancoDestino} · {nomina.numeroCuenta}
          </span>
        )}
      </span>
    </span>
  );
}

/**
 * Selector Efectivo / Depósito de una boleta. Depósito solo se habilita si el empleado
 * tiene banco y número de cuenta registrados.
 */
export function SelectorMetodoPago({ nomina, empleado }: { nomina: Nomina; empleado?: Empleado | null }) {
  const queryClient = useQueryClient();
  const cambiar = useMutation({
    mutationFn: (metodoPago: MetodoPago) => api.patch<Nomina>(`/nominas/${nomina.id}/metodo-pago`, { metodoPago }),
    onSuccess: (n) => {
      toast.success(n.metodoPago === 'DEPOSITO' ? 'Se pagará por depósito' : 'Se pagará en efectivo');
      queryClient.invalidateQueries({ queryKey: ['periodos'] });
      queryClient.invalidateQueries({ queryKey: ['nominas'] });
    },
  });
  const conCuenta = tieneCuenta(empleado);

  return (
    <div>
      <select
        aria-label="Forma de pago"
        value={nomina.metodoPago}
        disabled={cambiar.isPending}
        onChange={(e) => cambiar.mutate(e.target.value as MetodoPago)}
        className="h-8 rounded-md border border-slate-300 bg-white pr-7 pl-2 text-sm text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none disabled:opacity-60"
      >
        <option value="EFECTIVO">Efectivo</option>
        <option value="DEPOSITO" disabled={!conCuenta}>
          {conCuenta ? 'Depósito' : 'Depósito (sin cuenta registrada)'}
        </option>
      </select>
      {nomina.metodoPago === 'DEPOSITO' && (
        <p className="mt-0.5 text-xs text-slate-500">
          {nomina.bancoDestino} · {nomina.numeroCuenta}
        </p>
      )}
    </div>
  );
}
