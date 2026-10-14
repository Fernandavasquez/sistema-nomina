import { ValueTransformer } from 'typeorm';

/** Redondea a 2 decimales evitando errores de punto flotante (0.1 + 0.2). */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * PostgreSQL devuelve las columnas `numeric` como string para no perder precisión.
 * Este transformer las convierte a number al leer y las deja tal cual al guardar.
 */
export const numericTransformer: ValueTransformer = {
  to: (value?: number | null) => value,
  from: (value?: string | null) => (value === null || value === undefined ? value : Number(value)),
};

/** Opciones estándar para columnas de dinero: numeric(12,2). */
export const moneyColumn = {
  type: 'numeric' as const,
  precision: 12,
  scale: 2,
  transformer: numericTransformer,
};
