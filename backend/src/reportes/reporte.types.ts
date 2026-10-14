/**
 * Estructura común de todos los reportes. Cada reporte solo arma estos datos;
 * los exportadores (Excel, PDF) y la vista previa del frontend saben dibujarla.
 */

export type TipoColumna = 'texto' | 'dinero' | 'fecha' | 'numero';

export interface Columna {
  clave: string;
  titulo: string;
  tipo?: TipoColumna;
  /** Peso relativo del ancho de la columna (por defecto 1). */
  ancho?: number;
}

export type Fila = Record<string, string | number | null>;

export interface Tabla {
  titulo?: string;
  columnas: Columna[];
  filas: Fila[];
  /** Totales por clave de columna (se muestran en una fila final). */
  totales?: Record<string, number>;
}

export interface Reporte extends Tabla {
  titulo: string;
  subtitulo?: string;
  /** Datos destacados que van arriba del reporte (ej. "Total a pagar: Q 9,700.00"). */
  resumen?: { etiqueta: string; valor: string }[];
  /** Tablas adicionales (ej. totales por banco). En Excel van en otra hoja. */
  anexos?: Tabla[];
  /** Nombre de archivo sin extensión (solo letras, números y guiones). */
  nombreArchivo: string;
  generado: string;
}

export type FormatoReporte = 'json' | 'xlsx' | 'pdf';
