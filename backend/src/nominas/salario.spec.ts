import { FrecuenciaCodigo } from '../common/enums.js';
import { calcularSueldo, descuentoFaltas, diasDelMes, salarioDiario, salarioPorPago } from './salario.js';

const semanal = { codigo: FrecuenciaCodigo.SEMANAL, diasPeriodo: 7 };
const quincenal = { codigo: FrecuenciaCodigo.QUINCENAL, diasPeriodo: 15 };

describe('pago completo (fijo)', () => {
  it('quincena = mensual ÷ 2 y semana = mensual × 12 ÷ 52', () => {
    expect(salarioPorPago(3000, quincenal)).toBe(1500);
    expect(salarioPorPago(3000, semanal)).toBe(692.31);
  });
});

describe('salario diario según los días reales del mes', () => {
  it('enero ÷ 31, febrero ÷ 28 (29 en bisiesto), abril ÷ 30', () => {
    expect(diasDelMes('2026-02-10')).toBe(28);
    expect(diasDelMes('2028-02-10')).toBe(29);
    expect(salarioDiario(3000, '2026-01-10')).toBe(96.77);
    expect(salarioDiario(3000, '2026-02-10')).toBe(107.14);
    expect(salarioDiario(3000, '2026-04-10')).toBe(100);
  });

  it('las faltas se descuentan con el diario del mes del período', () => {
    expect(descuentoFaltas(3000, 1, '2026-01-31')).toBe(96.77);
    expect(descuentoFaltas(3000, 2, '2026-02-28')).toBe(214.29);
    expect(descuentoFaltas(3000, 0, '2026-04-30')).toBe(0);
  });
});

describe('calcularSueldo', () => {
  const semana = { fechaInicio: '2026-01-05', fechaFin: '2026-01-11' }; // lunes a domingo
  const segundaEnero = { fechaInicio: '2026-01-16', fechaFin: '2026-01-31' };

  it('paga el período completo si ya trabajaba desde antes', () => {
    expect(calcularSueldo(3000, quincenal, segundaEnero, '2025-06-01')).toEqual({
      monto: 1500,
      diasLaborados: 16,
      proporcional: false,
    });
    expect(calcularSueldo(3000, semanal, semana, '2026-01-05').monto).toBe(692.31);
  });

  it('ingreso a medio período: días trabajados × diario del mes', () => {
    // Entra el 20 de enero: 12 días × 3000/31.
    expect(calcularSueldo(3000, quincenal, segundaEnero, '2026-01-20')).toEqual({
      monto: 1161.29,
      diasLaborados: 12,
      proporcional: true,
    });
    // Entra el miércoles: 5 días × 3000/31.
    expect(calcularSueldo(3000, semanal, semana, '2026-01-07').monto).toBe(483.87);
  });

  it('una semana entre dos meses usa el diario de cada mes', () => {
    const semanaCruzada = { fechaInicio: '2026-01-26', fechaFin: '2026-02-01' };
    // Entra el sábado 31 de enero: 1 día ÷ 31 + 1 día ÷ 28.
    expect(calcularSueldo(3000, semanal, semanaCruzada, '2026-01-31').monto).toBe(203.92);
  });

  it('nunca paga más que el período completo', () => {
    // 2da quincena de febrero tiene 13 días: 12 × 107.14 sería más que Q1,500 si no hubiera tope.
    const febrero = { fechaInicio: '2026-02-16', fechaFin: '2026-02-28' };
    expect(calcularSueldo(3000, quincenal, febrero, '2026-02-17').monto).toBe(1285.71);
    expect(
      calcularSueldo(4000, semanal, { fechaInicio: '2026-02-02', fechaFin: '2026-02-08' }, '2026-02-03').monto,
    ).toBeLessThanOrEqual(salarioPorPago(4000, semanal));
  });
});
