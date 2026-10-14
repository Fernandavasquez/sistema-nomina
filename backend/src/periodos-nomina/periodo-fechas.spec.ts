import { ajustarInicioQuincena, calcularFechaFin } from './periodo-fechas.js';

describe('calcularFechaFin', () => {
  it('semanal: 7 días', () => {
    expect(calcularFechaFin('SEMANAL', 7, '2026-10-12')).toBe('2026-10-18');
  });

  it('semanal: cruza de mes y de año', () => {
    expect(calcularFechaFin('SEMANAL', 7, '2026-12-28')).toBe('2027-01-03');
  });

  it('primera quincena: del 1 al 15', () => {
    expect(calcularFechaFin('QUINCENAL', 15, '2026-10-01')).toBe('2026-10-15');
  });

  it('segunda quincena: del 16 al último día del mes (incluye febrero)', () => {
    expect(calcularFechaFin('QUINCENAL', 15, '2026-10-16')).toBe('2026-10-31');
    expect(calcularFechaFin('QUINCENAL', 15, '2028-02-16')).toBe('2028-02-29');
  });
});

describe('ajustarInicioQuincena', () => {
  it('lleva cualquier fecha al inicio de su quincena', () => {
    expect(ajustarInicioQuincena('2026-10-07')).toBe('2026-10-01');
    expect(ajustarInicioQuincena('2026-10-20')).toBe('2026-10-16');
    expect(ajustarInicioQuincena('2026-10-16')).toBe('2026-10-16');
  });
});
