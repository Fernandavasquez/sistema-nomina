import { FrecuenciaCodigo } from '../common/enums.js';
import { addDays, lastDayOfMonth, toDate } from '../common/utils/dates.js';

/**
 * Calcula la fecha fin de un período a partir de su inicio:
 * - SEMANAL: 7 días (inicio + 6).
 * - QUINCENAL: quincenas de calendario (1–15 y 16–fin de mes), como se paga normalmente.
 * - Otras frecuencias: inicio + diasPeriodo − 1.
 */
export function calcularFechaFin(codigo: string, diasPeriodo: number, fechaInicio: string): string {
  if (codigo === FrecuenciaCodigo.QUINCENAL) {
    const dia = toDate(fechaInicio).getUTCDate();
    return dia <= 15 ? `${fechaInicio.slice(0, 8)}15` : lastDayOfMonth(fechaInicio);
  }
  return addDays(fechaInicio, diasPeriodo - 1);
}

/** Para quincenas el inicio natural es el día 1 o el 16. */
export function ajustarInicioQuincena(fechaInicio: string): string {
  const dia = toDate(fechaInicio).getUTCDate();
  if (dia === 1 || dia === 16) return fechaInicio;
  return dia < 16 ? `${fechaInicio.slice(0, 8)}01` : `${fechaInicio.slice(0, 8)}16`;
}
