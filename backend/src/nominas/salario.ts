import { FrecuenciaCodigo } from '../common/enums.js';
import { addDays, lastDayOfMonth, toDate } from '../common/utils/dates.js';
import { round2 } from '../common/utils/money.js';

/**
 * Reglas del salario (el empleado tiene un salario MENSUAL):
 *  - Pago completo FIJO: quincena = mensual ÷ 2 · semana = mensual × 12 ÷ 52.
 *  - Salario diario según los días reales del mes: mensual ÷ 28, 29, 30 o 31.
 *    Se usa para las faltas y para el primer pago de quien ingresa a medio período.
 *  - Falta: descuenta un salario diario del mes en que termina el período.
 *  - Ingreso a medio período: días trabajados × diario de cada día, sin pasar del pago completo.
 */

export function diasDelMes(fecha: string): number {
  return toDate(lastDayOfMonth(fecha)).getUTCDate();
}

/** Salario de un día, según el mes de esa fecha (enero ÷ 31, febrero ÷ 28…). */
export function salarioDiario(salarioMensual: number, fecha: string): number {
  return round2(salarioMensual / diasDelMes(fecha));
}

/** Lo que recibe en un pago completo según su frecuencia. */
export function salarioPorPago(salarioMensual: number, frecuencia: { codigo: string; diasPeriodo: number }): number {
  if (frecuencia.codigo === FrecuenciaCodigo.QUINCENAL) return round2(salarioMensual / 2);
  if (frecuencia.codigo === FrecuenciaCodigo.SEMANAL) return round2((salarioMensual * 12) / 52);
  return round2((salarioMensual * frecuencia.diasPeriodo) / 30);
}

/** Descuento por N días de falta, con el diario del mes en que termina el período. */
export function descuentoFaltas(salarioMensual: number, dias: number, fechaFin: string): number {
  return round2((salarioMensual * dias) / diasDelMes(fechaFin));
}

export function diasCalendario(desde: string, hasta: string): number {
  if (hasta < desde) return 0;
  return Math.round((toDate(hasta).getTime() - toDate(desde).getTime()) / 86_400_000) + 1;
}

export interface SueldoPeriodo {
  /** Monto del sueldo en este período. */
  monto: number;
  /** Días que trabajó en el período (todos, o desde su ingreso). Tope para las faltas. */
  diasLaborados: number;
  /** true si ingresó a medio período y se le paga proporcional. */
  proporcional: boolean;
}

/** Sueldo del período: completo, o proporcional si ingresó después de que empezó. */
export function calcularSueldo(
  salarioMensual: number,
  frecuencia: { codigo: string; diasPeriodo: number },
  periodo: { fechaInicio: string; fechaFin: string },
  fechaIngreso: string,
): SueldoPeriodo {
  const completo = salarioPorPago(salarioMensual, frecuencia);
  if (fechaIngreso <= periodo.fechaInicio) {
    return {
      monto: completo,
      diasLaborados: diasCalendario(periodo.fechaInicio, periodo.fechaFin),
      proporcional: false,
    };
  }
  const diasLaborados = diasCalendario(fechaIngreso, periodo.fechaFin);
  let monto = 0;
  // Cada día con el diario de su mes (una semana puede tener días de dos meses).
  for (let i = 0; i < diasLaborados; i++) {
    monto += salarioMensual / diasDelMes(addDays(fechaIngreso, i));
  }
  return { monto: Math.min(round2(monto), completo), diasLaborados, proporcional: true };
}

/** Para los mensajes: "20/01/2026". */
export function fechaCorta(fecha: string): string {
  const [y, m, d] = fecha.split('-');
  return `${d}/${m}/${y}`;
}
