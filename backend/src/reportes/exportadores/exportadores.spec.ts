import ExcelJS from 'exceljs';
import type { Reporte } from '../reporte.types.js';
import { reporteAExcel } from './excel.js';
import { reporteAPdf } from './pdf.js';

function reporteDePrueba(filas: number): Reporte {
  return {
    titulo: 'Planilla de prueba',
    subtitulo: 'Del 01/10/2026 al 07/10/2026 · Pérez, Muñoz y Peña',
    resumen: [{ etiqueta: 'Total a pagar', valor: 'Q 1,000.00' }],
    columnas: [
      { clave: 'empleado', titulo: 'Empleado', ancho: 2 },
      { clave: 'fecha', titulo: 'Fecha', tipo: 'fecha' },
      { clave: 'liquido', titulo: 'Líquido', tipo: 'dinero' },
    ],
    filas: Array.from({ length: filas }, (_, i) => ({ empleado: `Muñoz Peña, José ${i + 1}`, fecha: '2026-10-07', liquido: 100.5 })),
    totales: { liquido: 100.5 * filas },
    anexos: [{ titulo: 'Depósitos por banco', columnas: [{ clave: 'banco', titulo: 'Banco' }], filas: [{ banco: 'Banrural' }] }],
    nombreArchivo: 'prueba',
    generado: '2026-10-14T16:00:00.000Z',
  };
}

describe('reporteAExcel', () => {
  it('genera un .xlsx con el reporte, los totales y una hoja por anexo', async () => {
    const buffer = await reporteAExcel(reporteDePrueba(3));
    const libro = new ExcelJS.Workbook();
    await libro.xlsx.load(buffer as unknown as ExcelJS.Buffer);

    expect(libro.worksheets.map((h) => h.name)).toEqual(['Reporte', 'Depósitos por banco']);
    const hoja = libro.getWorksheet('Reporte')!;
    expect(hoja.getCell('A1').value).toBe('Planilla de prueba');

    const valores = hoja.getSheetValues().flat().filter(Boolean);
    expect(valores).toContain('Muñoz Peña, José 1');
    expect(valores).toContain('TOTAL');
    expect(valores).toContain(301.5);
  });
});

describe('reporteAPdf', () => {
  it('genera un PDF válido', async () => {
    const buffer = await reporteAPdf(reporteDePrueba(3));
    expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('reparte una tabla larga en varias páginas', async () => {
    const buffer = await reporteAPdf(reporteDePrueba(120));
    const paginas = buffer.toString('latin1').match(/\/Type \/Page\b/g)?.length ?? 0;
    expect(paginas).toBeGreaterThan(1);
  });

  it('funciona con un reporte sin filas', async () => {
    const buffer = await reporteAPdf({ ...reporteDePrueba(0), totales: undefined });
    expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
  });
});
