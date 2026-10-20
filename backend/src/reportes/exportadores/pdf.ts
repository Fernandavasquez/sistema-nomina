import PDFDocument from 'pdfkit';
import type { Columna, Reporte, Tabla } from '../reporte.types.js';
import { fechaHoraGeneracion, textoCelda } from './formato.js';

export type Doc = PDFKit.PDFDocument;

export const MARGEN = 36;
const ALTO_FILA = 18;
const ALTO_ENCABEZADO = 22;
export const COLOR = { verde: '#047857', texto: '#0f172a', gris: '#64748b', cebra: '#f1f5f9', linea: '#cbd5e1' };

/** Convierte un reporte en PDF. Con más de 6 columnas la hoja va horizontal. */
export function reporteAPdf(reporte: Reporte): Promise<Buffer> {
  const horizontal = reporte.columnas.length > 6;
  const doc = new PDFDocument({
    size: 'LETTER',
    layout: horizontal ? 'landscape' : 'portrait',
    margin: MARGEN,
    bufferPages: true, // permite escribir "Página X de Y" al final
    info: { Title: reporte.titulo, Creator: 'Sistema de Nómina' },
  });

  const partes: Buffer[] = [];
  doc.on('data', (p: Buffer) => partes.push(p));
  const terminado = new Promise<Buffer>((ok, error) => {
    doc.on('end', () => ok(Buffer.concat(partes)));
    doc.on('error', error);
  });

  encabezadoReporte(doc, reporte);
  dibujarTabla(doc, reporte);
  for (const anexo of reporte.anexos ?? []) {
    doc.moveDown(1.5);
    if (anexo.titulo) {
      asegurarEspacio(doc, ALTO_ENCABEZADO * 3);
      doc.font('Helvetica-Bold').fontSize(12).fillColor(COLOR.verde).text(anexo.titulo, MARGEN);
      doc.moveDown(0.5);
    }
    dibujarTabla(doc, anexo);
  }
  piePaginas(doc, reporte.generado);
  doc.end();
  return terminado;
}

export function anchoUtil(doc: Doc) {
  return doc.page.width - MARGEN * 2;
}

function encabezadoReporte(doc: Doc, reporte: Reporte) {
  doc.font('Helvetica-Bold').fontSize(9).fillColor(COLOR.gris).text('SISTEMA DE NÓMINA', MARGEN, MARGEN);
  doc.moveDown(0.3);
  doc.font('Helvetica-Bold').fontSize(16).fillColor(COLOR.texto).text(reporte.titulo);
  if (reporte.subtitulo) doc.font('Helvetica').fontSize(10).fillColor(COLOR.gris).text(reporte.subtitulo);
  doc.moveDown(0.6);

  if (reporte.resumen?.length) {
    // Los datos destacados van en "tarjetas" una al lado de otra.
    const y = doc.y;
    const ancho = anchoUtil(doc) / reporte.resumen.length;
    reporte.resumen.forEach(({ etiqueta, valor }, i) => {
      const x = MARGEN + i * ancho;
      doc.roundedRect(x, y, ancho - 8, 38, 4).fillAndStroke('#f8fafc', '#e2e8f0');
      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor(COLOR.gris)
        .text(etiqueta, x + 8, y + 7, { width: ancho - 24 });
      doc
        .font('Helvetica-Bold')
        .fontSize(12)
        .fillColor(COLOR.texto)
        .text(valor, x + 8, y + 19, { width: ancho - 24 });
    });
    doc.y = y + 50;
  }
  doc.x = MARGEN;
}

/** Calcula el ancho de cada columna según su peso relativo. */
function anchos(doc: Doc, columnas: Columna[]) {
  const total = columnas.reduce((s, c) => s + (c.ancho ?? 1), 0);
  return columnas.map((c) => ((c.ancho ?? 1) / total) * anchoUtil(doc));
}

function alineacion(c: Columna): 'left' | 'right' {
  return c.tipo === 'dinero' || c.tipo === 'numero' ? 'right' : 'left';
}

/**
 * Dibuja el texto de una celda en una posición fija, en una sola línea.
 * Si no cabe, se corta con "…". No mueve la posición de las demás celdas.
 */
function celda(doc: Doc, texto: string, x: number, y: number, ancho: number, align: 'left' | 'right') {
  doc.text(texto, x + 4, y, { width: ancho - 8, height: 10, align, ellipsis: true });
}

function filaEncabezado(doc: Doc, columnas: Columna[], ws: number[]) {
  const y = doc.y;
  doc.rect(MARGEN, y, anchoUtil(doc), ALTO_ENCABEZADO).fill(COLOR.verde);
  doc.font('Helvetica-Bold').fontSize(8).fillColor('#ffffff');
  let x = MARGEN;
  columnas.forEach((c, i) => {
    celda(doc, c.titulo, x, y + 7, ws[i], alineacion(c));
    x += ws[i];
  });
  doc.y = y + ALTO_ENCABEZADO;
}

export function asegurarEspacio(doc: Doc, alto: number): boolean {
  if (doc.y + alto > doc.page.height - MARGEN - 20) {
    doc.addPage();
    doc.y = MARGEN;
    return true;
  }
  return false;
}

export function dibujarTabla(doc: Doc, tabla: Tabla) {
  const { columnas } = tabla;
  const ws = anchos(doc, columnas);
  asegurarEspacio(doc, ALTO_ENCABEZADO + ALTO_FILA * 2);
  filaEncabezado(doc, columnas, ws);

  if (!tabla.filas.length) {
    doc
      .font('Helvetica-Oblique')
      .fontSize(9)
      .fillColor(COLOR.gris)
      .text(tabla.textoVacio ?? 'Sin datos para los filtros elegidos.', MARGEN, doc.y + 8);
    doc.y += 8;
    doc.x = MARGEN;
    return;
  }

  const celdas = (y: number, valores: (string | number | null | undefined)[], negrita = false) => {
    doc
      .font(negrita ? 'Helvetica-Bold' : 'Helvetica')
      .fontSize(8)
      .fillColor(COLOR.texto);
    let x = MARGEN;
    columnas.forEach((c, i) => {
      celda(doc, textoCelda(valores[i], c.tipo), x, y + 5, ws[i], alineacion(c));
      x += ws[i];
    });
  };

  tabla.filas.forEach((fila, r) => {
    // Si no cabe la fila, nueva página repitiendo el encabezado de la tabla.
    if (asegurarEspacio(doc, ALTO_FILA)) filaEncabezado(doc, columnas, ws);
    const y = doc.y;
    if (r % 2 === 1) doc.rect(MARGEN, y, anchoUtil(doc), ALTO_FILA).fill(COLOR.cebra);
    celdas(
      y,
      columnas.map((c) => fila[c.clave]),
    );
    doc.y = y + ALTO_FILA;
  });

  if (tabla.totales) {
    asegurarEspacio(doc, ALTO_FILA);
    const y = doc.y;
    doc
      .moveTo(MARGEN, y)
      .lineTo(MARGEN + anchoUtil(doc), y)
      .lineWidth(1)
      .stroke(COLOR.texto);
    celdas(
      y,
      columnas.map((c, i) => (i === 0 ? 'TOTAL' : tabla.totales?.[c.clave])),
      true,
    );
    doc.y = y + ALTO_FILA;
  }
  doc.x = MARGEN;
}

export function piePaginas(doc: Doc, generado: string) {
  const { start, count } = doc.bufferedPageRange();
  for (let i = start; i < start + count; i++) {
    doc.switchToPage(i);
    const y = doc.page.height - MARGEN + 6;
    // Sin margen inferior temporalmente para que el pie no cree una página nueva.
    const margenInferior = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    doc.font('Helvetica').fontSize(7).fillColor(COLOR.gris);
    doc.text(`Generado el ${fechaHoraGeneracion(generado)}`, MARGEN, y, { lineBreak: false });
    doc.text(`Página ${i + 1} de ${count}`, MARGEN, y, { width: anchoUtil(doc), align: 'right', lineBreak: false });
    doc.page.margins.bottom = margenInferior;
  }
}
