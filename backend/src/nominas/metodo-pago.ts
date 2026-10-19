import { MetodoPago } from '../common/enums.js';
import type { Empleado } from '../empleados/entities/empleado.entity.js';

type DatosBancarios = Pick<Empleado, 'bancoDestino' | 'numeroCuenta'>;

/** El empleado puede recibir depósito solo si tiene banco y número de cuenta registrados. */
export function tieneCuenta(empleado: DatosBancarios): boolean {
  return !!(empleado.bancoDestino?.trim() && empleado.numeroCuenta?.trim());
}

/**
 * Datos de pago para una boleta. Sin método indicado: depósito si el empleado tiene
 * cuenta bancaria, efectivo si no. En depósito se copia el banco y la cuenta del empleado.
 */
export function datosPago(empleado: DatosBancarios, metodo?: MetodoPago) {
  const metodoPago = metodo ?? (tieneCuenta(empleado) ? MetodoPago.DEPOSITO : MetodoPago.EFECTIVO);
  return metodoPago === MetodoPago.DEPOSITO
    ? { metodoPago, bancoDestino: empleado.bancoDestino, numeroCuenta: empleado.numeroCuenta }
    : { metodoPago, bancoDestino: null, numeroCuenta: null };
}
