import { TipoConcepto } from '../common/enums.js';
import { calcularTotales } from './nomina-calculo.js';

const percepcion = (monto: number) => ({ monto, concepto: { tipo: TipoConcepto.PERCEPCION } });
const deduccion = (monto: number) => ({ monto, concepto: { tipo: TipoConcepto.DEDUCCION } });

describe('calcularTotales', () => {
  it('suma percepciones y resta deducciones', () => {
    expect(calcularTotales([percepcion(1500), percepcion(200), deduccion(300), deduccion(250)])).toEqual({
      totalPercepciones: 1700,
      totalDeducciones: 550,
      liquidoRecibir: 1150,
    });
  });

  it('redondea a 2 decimales sin errores de punto flotante', () => {
    expect(calcularTotales([percepcion(0.1), percepcion(0.2)]).liquidoRecibir).toBe(0.3);
  });

  it('permite detectar líquido negativo', () => {
    expect(calcularTotales([percepcion(500), deduccion(800)]).liquidoRecibir).toBe(-300);
  });
});
