import ExcelJS from 'exceljs';
import type { Reporte, Tabla } from '../reporte.types.js';
import { fechaHoraGeneracion } from './formato.js';

const FORMATO_DINERO = '"Q"#,##0.00;[Red]-"Q"#,##0.00';
const FORMATO_FECHA = 'dd/mm/yyyy';
const VERDE = 'FF047857';
const GRIS = 'FFF1F5F9';

/** Convierte un reporte en un archivo .xlsx (una hoja por tabla). */
export async function reporteAExcel(reporte: Reporte): Promise<Buffer> {
  const libro = new ExcelJS.Workbook();
  libro.creator = 'Sistema de Nómina';
  libro.created = new Date(reporte.generado);

  const hoja = libro.addWorksheet('Reporte', { views: [{ state: 'frozen', ySplit: 0 }] });
  let fila = 1;

  // Encabezado del reporte
  hoja.getCell(fila, 1).value = reporte.titulo;
  hoja.getCell(fila, 1).font = { bold: true, size: 16, color: { argb: VERDE } };
  fila++;
  if (reporte.subtitulo) {
    hoja.getCell(fila, 1).value = reporte.subtitulo;
    hoja.getCell(fila, 1).font = { color: { argb: 'FF475569' } };
    fila++;
  }
  hoja.getCell(fila, 1).value = `Generado el ${fechaHoraGeneracion(reporte.generado)}`;
  hoja.getCell(fila, 1).font = { italic: true, size: 9, color: { argb: 'FF94A3B8' } };
  fila += 2;

  for (const { etiqueta, valor } of reporte.resumen ?? []) {
    hoja.getCell(fila, 1).value = etiqueta;
    hoja.getCell(fila, 2).value = valor;
    hoja.getCell(fila, 2).font = { bold: true };
    fila++;
  }
  if (reporte.resumen?.length) fila++;

  const filaEncabezado = escribirTabla(hoja, reporte, fila);
  // Congela el encabezado de la tabla para que siempre se vea al bajar.
  hoja.views = [{ state: 'frozen', ySplit: filaEncabezado }];

  reporte.anexos?.forEach((anexo, i) => {
    const otra = libro.addWorksheet((anexo.titulo ?? `Anexo ${i + 1}`).slice(0, 31));
    otra.getCell(1, 1).value = anexo.titulo ?? '';
    otra.getCell(1, 1).font = { bold: true, size: 14, color: { argb: VERDE } };
    escribirTabla(otra, anexo, 3);
  });

  return Buffer.from(await libro.xlsx.writeBuffer());
}

/** Escribe encabezado, filas y totales a partir de la fila indicada. Devuelve la fila del encabezado. */
function escribirTabla(hoja: ExcelJS.Worksheet, tabla: Tabla, filaInicio: number): number {
  const { columnas } = tabla;

  const encabezado = hoja.getRow(filaInicio);
  columnas.forEach((c, i) => {
    const celda = encabezado.getCell(i + 1);
    celda.value = c.titulo;
    celda.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: VERDE } };
    celda.alignment = { vertical: 'middle', horizontal: c.tipo === 'dinero' || c.tipo === 'numero' ? 'right' : 'left' };
  });
  encabezado.height = 20;

  tabla.filas.forEach((datos, r) => {
    const fila = hoja.getRow(filaInicio + 1 + r);
    columnas.forEach((c, i) => {
      const celda = fila.getCell(i + 1);
      const valor = datos[c.clave];
      if (valor === null || valor === undefined || valor === '') return;
      if (c.tipo === 'fecha') {
        const [y, m, d] = String(valor).slice(0, 10).split('-').map(Number);
        celda.value = new Date(Date.UTC(y, m - 1, d));
        celda.numFmt = FORMATO_FECHA;
      } else if (c.tipo === 'dinero' || c.tipo === 'numero') {
        celda.value = Number(valor);
        if (c.tipo === 'dinero') celda.numFmt = FORMATO_DINERO;
      } else {
        celda.value = String(valor);
      }
    });
    if (r % 2 === 1) {
      columnas.forEach((_, i) => {
        fila.getCell(i + 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GRIS } };
      });
    }
  });

  const ultimaFila = filaInicio + tabla.filas.length;
  if (tabla.totales && tabla.filas.length) {
    const fila = hoja.getRow(ultimaFila + 1);
    fila.getCell(1).value = 'TOTAL';
    columnas.forEach((c, i) => {
      const total = tabla.totales?.[c.clave];
      if (total === undefined) return;
      const celda = fila.getCell(i + 1);
      celda.value = total;
      if (c.tipo === 'dinero') celda.numFmt = FORMATO_DINERO;
    });
    fila.font = { bold: true };
    fila.eachCell((celda) => {
      celda.border = { top: { style: 'thin' } };
    });
  }

  // Filtros en el encabezado y ancho de columnas según su contenido.
  if (tabla.filas.length) {
    hoja.autoFilter = { from: { row: filaInicio, column: 1 }, to: { row: ultimaFila, column: columnas.length } };
  }
  columnas.forEach((c, i) => {
    const largos = tabla.filas.map((f) => String(f[c.clave] ?? '').length);
    const base = c.tipo === 'dinero' ? 14 : c.tipo === 'fecha' ? 12 : 10;
    hoja.getColumn(i + 1).width = Math.min(45, Math.max(base, c.titulo.length + 2, ...largos.map((l) => l + 2)));
  });

  return filaInicio;
}
