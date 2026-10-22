/**
 * Documentos que se pueden adjuntar a un empleado. Cada uno se guarda en su propia carpeta
 * y en su propia columna de la tabla empleados.
 * Para agregar otro documento: una línea aquí, la columna en la entidad y su migración.
 */
export const DOCUMENTOS = {
  'foto-dpi': { columna: 'fotoDpi', carpeta: 'dpi', nombre: 'foto del DPI' },
  'recibo-luz': { columna: 'reciboLuz', carpeta: 'recibos-luz', nombre: 'recibo de luz' },
  licencia: { columna: 'licenciaConducir', carpeta: 'licencias', nombre: 'licencia de conducir' },
} as const;

export type TipoDocumento = keyof typeof DOCUMENTOS;

/** Formatos permitidos y la extensión con que se guardan. */
export const FORMATOS_DOCUMENTO: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
};

export const MAX_DOCUMENTO_BYTES = 5 * 1024 * 1024;
