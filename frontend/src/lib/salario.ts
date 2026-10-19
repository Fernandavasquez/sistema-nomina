import type { FrecuenciaPago } from './types';

/**
 * Mismas reglas que el backend (backend/src/nominas/salario.ts):
 * quincena = mensual ÷ 2 · semana = mensual × 12 ÷ 52 · diario = mensual ÷ días del mes.
 */
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function salarioPorPago(salarioMensual: number, frecuencia: Pick<FrecuenciaPago, 'codigo' | 'diasPeriodo'>) {
  if (frecuencia.codigo === 'QUINCENAL') return round2(salarioMensual / 2);
  if (frecuencia.codigo === 'SEMANAL') return round2((salarioMensual * 12) / 52);
  return round2((salarioMensual * frecuencia.diasPeriodo) / 30);
}

/** Diario de un mes de N días (28, 29, 30 o 31). */
export function salarioDiario(salarioMensual: number, diasMes: number) {
  return round2(salarioMensual / diasMes);
}
