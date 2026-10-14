const moneda = new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' });

/** 1500 → "Q1,500.00" */
export function money(value: number | null | undefined): string {
  return moneda.format(value ?? 0);
}

/** '2026-10-14' → '14/10/2026' (sin conversión de zona horaria) */
export function date(iso: string | null | undefined): string {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

/** '2026-10-14T15:30:00Z' → '14/10/2026, 09:30' en hora local */
export function dateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-GT', { dateStyle: 'short', timeStyle: 'short' });
}

export function today(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

export function nombreCompleto(e: { nombres: string; apellidos: string } | undefined | null): string {
  return e ? `${e.nombres} ${e.apellidos}` : '—';
}

export function nombrePeriodo(p: { numeroPeriodo: number; anio: number; frecuenciaPago?: { nombre: string } }): string {
  const tipo = p.frecuenciaPago?.nombre === 'Quincenal' ? 'Quincena' : 'Semana';
  return `${tipo} ${p.numeroPeriodo} · ${p.anio}`;
}

/** '2547896541201' → '2547 89654 1201' (formato del DPI de Guatemala) */
export function dpi(value: string): string {
  return value.length === 13 ? `${value.slice(0, 4)} ${value.slice(4, 9)} ${value.slice(9)}` : value;
}
