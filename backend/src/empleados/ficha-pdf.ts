import PDFDocument from 'pdfkit';
import { salarioPorPago } from '../nominas/salario.js';
import {
  COLOR,
  type Doc,
  MARGEN,
  anchoUtil,
  asegurarEspacio,
  dibujarTabla,
  piePaginas,
} from '../reportes/exportadores/pdf.js';
import { fechaCorta, textoCelda } from '../reportes/exportadores/formato.js';
import type { Adelanto } from '../adelantos/entities/adelanto.entity.js';
import type { NominaEncabezado } from '../nominas/entities/nomina-encabezado.entity.js';
import type { Prestamo } from '../prestamos/entities/prestamo.entity.js';
import type { Empleado } from './entities/empleado.entity.js';

/** Un documento adjunto: si es foto (JPG/PNG) se dibuja; si es PDF o WEBP solo se menciona. */
export interface DocumentoFicha {
  titulo: string;
  imagen?: Buffer;
  nota?: string;
}

export interface DatosFicha {
  empleado: Empleado;
  totalAdelantosPendientes: number;
  totalSaldoPrestamos: number;
  adelantosPendientes: Adelanto[];
  prestamosActivos: Prestamo[];
  ultimasNominas: NominaEncabezado[];
  documentos: DocumentoFicha[];
  generado: string;
}

const dinero = (n: number) => textoCelda(n, 'dinero');
const dpi = (d: string) => `${d.slice(0, 4)} ${d.slice(4, 9)} ${d.slice(9)}`;
const ESTADOS_NOMINA: Record<string, string> = { GENERADA: 'En revisión', PAGADA: 'Pagada', ANULADA: 'Anulada' };

/** Ficha del empleado en PDF: datos, salario, estado de cuenta, últimos pagos y documentos. */
export function fichaEmpleadoPdf(datos: DatosFicha): Promise<Buffer> {
  const { empleado: e } = datos;
  const doc = new PDFDocument({
    size: 'LETTER',
    margin: MARGEN,
    bufferPages: true,
    info: { Title: `Ficha de ${e.nombres} ${e.apellidos}`, Creator: 'Sistema de Nómina' },
  });
  const partes: Buffer[] = [];
  doc.on('data', (p: Buffer) => partes.push(p));
  const terminado = new Promise<Buffer>((ok, error) => {
    doc.on('end', () => ok(Buffer.concat(partes)));
    doc.on('error', error);
  });

  // Encabezado
  doc
    .font('Helvetica-Bold')
    .fontSize(9)
    .fillColor(COLOR.gris)
    .text(`${e.empresa.nombre.toUpperCase()} · FICHA DEL EMPLEADO`, MARGEN, MARGEN);
  doc.moveDown(0.3);
  doc.font('Helvetica-Bold').fontSize(18).fillColor(COLOR.texto).text(`${e.nombres} ${e.apellidos}`);
  doc
    .font('Helvetica')
    .fontSize(10)
    .fillColor(e.estado === 'ACTIVO' ? COLOR.verde : '#b91c1c')
    .text(`${e.puesto.nombre} · ${e.estado === 'ACTIVO' ? 'Activo' : 'Inactivo'}`);
  doc.moveDown(0.8);

  const pago = salarioPorPago(e.salarioMensual, e.frecuenciaPago);
  tarjetas(doc, [
    ['Salario mensual', dinero(e.salarioMensual)],
    [`Pago ${e.frecuenciaPago.nombre.toLowerCase()}`, dinero(pago)],
    ['Adelantos por descontar', dinero(datos.totalAdelantosPendientes)],
    ['Saldo de préstamos', dinero(datos.totalSaldoPrestamos)],
  ]);

  seccion(doc, 'Datos personales');
  campos(doc, [
    ['DPI', dpi(e.dpi)],
    ['Teléfono', e.telefono],
    ['Correo', e.email],
    ['Dirección', e.direccion],
  ]);

  seccion(doc, 'Datos laborales y de pago');
  campos(doc, [
    ['Empresa', e.empresa.nombre],
    ['Puesto', e.puesto.nombre],
    ['Fecha de ingreso', fechaCorta(e.fechaIngreso)],
    ['Frecuencia de pago', e.frecuenciaPago.nombre],
    ['Salario mensual', dinero(e.salarioMensual)],
    ['Banco', e.bancoDestino],
    ['No. de cuenta', e.numeroCuenta],
  ]);

  seccion(doc, 'Adelantos pendientes');
  dibujarTabla(doc, {
    columnas: [
      { clave: 'fecha', titulo: 'Fecha', tipo: 'fecha', ancho: 1 },
      { clave: 'observacion', titulo: 'Observación', ancho: 3 },
      { clave: 'monto', titulo: 'Monto', tipo: 'dinero', ancho: 1 },
    ],
    filas: datos.adelantosPendientes.map((a) => ({
      fecha: a.fechaSolicitud,
      observacion: a.observacion,
      monto: a.monto,
    })),
    textoVacio: 'No tiene adelantos pendientes.',
  });

  seccion(doc, 'Préstamos activos');
  dibujarTabla(doc, {
    columnas: [
      { clave: 'fecha', titulo: 'Fecha', tipo: 'fecha' },
      { clave: 'total', titulo: 'Préstamo', tipo: 'dinero' },
      { clave: 'cuota', titulo: 'Cuota', tipo: 'dinero' },
      { clave: 'saldo', titulo: 'Saldo', tipo: 'dinero' },
    ],
    filas: datos.prestamosActivos.map((p) => ({
      fecha: p.fechaSolicitud,
      total: p.montoTotal,
      cuota: p.montoCuota,
      saldo: p.saldoPendiente,
    })),
    textoVacio: 'No tiene préstamos activos.',
  });

  seccion(doc, 'Últimos pagos');
  dibujarTabla(doc, {
    columnas: [
      { clave: 'periodo', titulo: 'Período', ancho: 1.6 },
      { clave: 'fechas', titulo: 'Fechas', ancho: 1.8 },
      { clave: 'percepciones', titulo: 'Percepciones', tipo: 'dinero', ancho: 1.2 },
      { clave: 'deducciones', titulo: 'Deducciones', tipo: 'dinero', ancho: 1.2 },
      { clave: 'liquido', titulo: 'Líquido', tipo: 'dinero', ancho: 1.2 },
      { clave: 'estado', titulo: 'Estado', ancho: 1 },
    ],
    filas: datos.ultimasNominas.map((n) => ({
      periodo: `${n.periodo.frecuenciaPago?.codigo === 'QUINCENAL' ? 'Quincena' : 'Semana'} ${n.periodo.numeroPeriodo} · ${n.periodo.anio}`,
      fechas: `${fechaCorta(n.periodo.fechaInicio)} – ${fechaCorta(n.periodo.fechaFin)}`,
      percepciones: n.totalPercepciones,
      deducciones: n.totalDeducciones,
      liquido: n.liquidoRecibir,
      estado: ESTADOS_NOMINA[n.estado] ?? n.estado,
    })),
    textoVacio: 'Todavía no tiene pagos.',
  });

  documentos(doc, datos.documentos);
  piePaginas(doc, datos.generado);
  doc.end();
  return terminado;
}

/** Título de sección; `espacio` es lo mínimo que debe caber debajo para no dejar el título solo al final de la hoja. */
function seccion(doc: Doc, titulo: string, espacio = 60) {
  doc.moveDown(1);
  asegurarEspacio(doc, espacio + 25);
  doc.font('Helvetica-Bold').fontSize(12).fillColor(COLOR.verde).text(titulo, MARGEN);
  const y = doc.y + 2;
  doc
    .moveTo(MARGEN, y)
    .lineTo(MARGEN + anchoUtil(doc), y)
    .lineWidth(0.5)
    .stroke(COLOR.linea);
  doc.y = y + 6;
}

/** Datos en dos columnas: etiqueta gris arriba, valor abajo. */
function campos(doc: Doc, lista: [string, string | null | undefined][]) {
  const ancho = anchoUtil(doc) / 2;
  for (let i = 0; i < lista.length; i += 2) {
    asegurarEspacio(doc, 34);
    const y = doc.y;
    let alto = 0;
    lista.slice(i, i + 2).forEach(([etiqueta, valor], j) => {
      const x = MARGEN + j * ancho;
      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor(COLOR.gris)
        .text(etiqueta, x, y, { width: ancho - 12 });
      doc
        .font('Helvetica')
        .fontSize(10)
        .fillColor(COLOR.texto)
        .text(valor?.trim() || '—', x, y + 11, { width: ancho - 12 });
      alto = Math.max(alto, doc.y - y);
    });
    doc.y = y + alto + 6;
  }
  doc.x = MARGEN;
}

function tarjetas(doc: Doc, lista: [string, string][]) {
  const y = doc.y;
  const ancho = anchoUtil(doc) / lista.length;
  lista.forEach(([etiqueta, valor], i) => {
    const x = MARGEN + i * ancho;
    doc.roundedRect(x, y, ancho - 8, 40, 4).fillAndStroke('#f8fafc', '#e2e8f0');
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor(COLOR.gris)
      .text(etiqueta, x + 8, y + 7, { width: ancho - 24 });
    doc
      .font('Helvetica-Bold')
      .fontSize(12)
      .fillColor(COLOR.texto)
      .text(valor, x + 8, y + 20, { width: ancho - 24 });
  });
  doc.y = y + 48;
  doc.x = MARGEN;
}

/** Foto del DPI y recibo de luz, cada foto con un alto máximo para que quepan en la hoja. */
function documentos(doc: Doc, lista: DocumentoFicha[]) {
  const ALTO_IMAGEN = 260;
  seccion(doc, 'Documentos', lista[0]?.imagen ? ALTO_IMAGEN + 30 : 40);
  if (!lista.length) {
    doc.font('Helvetica-Oblique').fontSize(9).fillColor(COLOR.gris).text('No se han subido documentos.', MARGEN);
    return;
  }
  for (const d of lista) {
    asegurarEspacio(doc, d.imagen ? ALTO_IMAGEN + 30 : 30);
    doc.font('Helvetica-Bold').fontSize(10).fillColor(COLOR.texto).text(d.titulo, MARGEN);
    doc.moveDown(0.3);
    if (d.imagen) {
      try {
        // openImage existe en pdfkit aunque sus tipos no lo declaren: da el tamaño real de la foto.
        const imagen = (doc as Doc & { openImage(src: Buffer): { width: number; height: number } }).openImage(d.imagen);
        const escala = Math.min(anchoUtil(doc) / imagen.width, ALTO_IMAGEN / imagen.height, 1);
        const y = doc.y;
        doc.image(d.imagen, MARGEN, y, { width: imagen.width * escala, height: imagen.height * escala });
        doc.y = y + imagen.height * escala + 12;
      } catch {
        doc.font('Helvetica-Oblique').fontSize(9).fillColor(COLOR.gris).text('No se pudo leer la imagen.', MARGEN);
      }
    } else {
      doc
        .font('Helvetica-Oblique')
        .fontSize(9)
        .fillColor(COLOR.gris)
        .text(d.nota ?? '', MARGEN);
      doc.moveDown(0.6);
    }
  }
}
