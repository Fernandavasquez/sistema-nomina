export enum RolNombre {
  ADMIN = 'ADMIN',
  OPERADOR = 'OPERADOR',
}

export enum FrecuenciaCodigo {
  SEMANAL = 'SEMANAL',
  QUINCENAL = 'QUINCENAL',
}

export enum EstadoEmpleado {
  ACTIVO = 'ACTIVO',
  INACTIVO = 'INACTIVO',
}

export enum EstadoPrestamo {
  ACTIVO = 'ACTIVO',
  PAGADO = 'PAGADO',
  CANCELADO = 'CANCELADO',
}

export enum EstadoPeriodo {
  /** Recién creado; se pueden registrar adelantos y préstamos. */
  ABIERTO = 'ABIERTO',
  /** Nóminas calculadas; se pueden revisar y agregar bonos/descuentos manuales. */
  PROCESADO = 'PROCESADO',
  /** Pagado. Adelantos marcados como aplicados y saldos de préstamos rebajados. No editable. */
  CERRADO = 'CERRADO',
}

export enum EstadoNomina {
  GENERADA = 'GENERADA',
  PAGADA = 'PAGADA',
}

export enum TipoConcepto {
  PERCEPCION = 'PERCEPCION',
  DEDUCCION = 'DEDUCCION',
}

/** Conceptos que el sistema calcula automáticamente al procesar un período. */
export enum ConceptoSistema {
  SUELDO_BASE = 'SUELDO_BASE',
  ADELANTO = 'ADELANTO',
  PRESTAMO = 'PRESTAMO',
}
