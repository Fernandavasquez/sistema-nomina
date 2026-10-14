import type { TipoColumna } from '../reporte.types.js';

const moneda = new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' });
const numero = new Intl.NumberFormat('es-GT');

/** '2026-10-14' → '14/10/2026' */
export function fechaCorta(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

/** Texto de una celda según el tipo de columna (para PDF). */
export function textoCelda(valor: string | number | null | undefined, tipo: TipoColumna = 'texto'): string {
  if (valor === null || valor === undefined || valor === '') return '';
  if (tipo === 'dinero') return moneda.format(Number(valor));
  if (tipo === 'numero') return numero.format(Number(valor));
  if (tipo === 'fecha') return fechaCorta(String(valor));
  return String(valor);
}

/** Fecha y hora de Guatemala para el pie "Generado el ...". */
export function fechaHoraGeneracion(iso: string): string {
  return new Date(iso).toLocaleString('es-GT', {
    timeZone: process.env.TZ ?? 'America/Guatemala',
    dateStyle: 'short',
    timeStyle: 'short',
  });
}
