// Tipos que reflejan las respuestas de la API (ver entidades del backend).

export type RolNombre = 'ADMIN' | 'OPERADOR';
export type EstadoEmpleado = 'ACTIVO' | 'INACTIVO';
export type EstadoPrestamo = 'ACTIVO' | 'PAGADO' | 'CANCELADO';
export type EstadoPeriodo = 'ABIERTO' | 'PROCESADO' | 'CERRADO' | 'ANULADO';
export type EstadoNomina = 'GENERADA' | 'PAGADA' | 'ANULADA';

/** Datos de auditoría de un período o boleta anulados. */
export interface Anulacion {
  motivoAnulacion: string | null;
  fechaAnulacion: string | null;
  anuladoPor: { nombre: string; apellido: string; username: string } | null;
}
export type TipoConcepto = 'PERCEPCION' | 'DEDUCCION';
export type MetodoPago = 'EFECTIVO' | 'DEPOSITO';

interface Base {
  id: number;
  createdAt: string;
  updatedAt: string;
}

export interface Rol extends Base {
  nombre: RolNombre;
  descripcion: string | null;
  isActive: boolean;
}

export interface Usuario extends Base {
  nombre: string;
  apellido: string;
  username: string;
  email: string;
  isActive: boolean;
  ultimoAcceso: string | null;
  rolId: number;
  rol: Rol;
}

export interface Puesto extends Base {
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  /** Solo en GET /puestos */
  empleadosActivos?: number;
  empleadosTotal?: number;
}

export interface FrecuenciaPago extends Base {
  codigo: 'SEMANAL' | 'QUINCENAL';
  nombre: string;
  diasPeriodo: number;
}

export interface ConceptoNomina extends Base {
  codigo: string;
  nombre: string;
  tipo: TipoConcepto;
  esSistema: boolean;
  activo: boolean;
}

export interface Empleado extends Base {
  nombres: string;
  apellidos: string;
  dpi: string;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  fechaIngreso: string;
  estado: EstadoEmpleado;
  /** Salario mensual; el pago semanal/quincenal se calcula. */
  salarioMensual: number;
  bancoDestino: string | null;
  numeroCuenta: string | null;
  fotoDpi: string | null;
  reciboLuz: string | null;
  puestoId: number;
  puesto: Puesto;
  frecuenciaPagoId: number;
  frecuenciaPago: FrecuenciaPago;
}

export interface Adelanto extends Base {
  empleadoId: number;
  empleado?: Empleado;
  monto: number;
  fechaSolicitud: string;
  aplicado: boolean;
  observacion: string | null;
}

export interface Prestamo extends Base {
  empleadoId: number;
  empleado?: Empleado;
  montoTotal: number;
  montoCuota: number;
  saldoPendiente: number;
  fechaSolicitud: string;
  estado: EstadoPrestamo;
  observacion: string | null;
}

export interface PrestamoDetalle extends Prestamo {
  abonos: { id: number; monto: number; nominaId: number; estadoNomina: EstadoNomina; periodo: PeriodoNomina }[];
}

export interface PeriodoNomina extends Base, Partial<Anulacion> {
  frecuenciaPagoId: number;
  frecuenciaPago: FrecuenciaPago;
  anio: number;
  numeroPeriodo: number;
  fechaInicio: string;
  fechaFin: string;
  fechaPago: string;
  estado: EstadoPeriodo;
}

export interface NominaDetalle extends Base {
  nominaId: number;
  conceptoId: number;
  concepto: ConceptoNomina;
  monto: number;
  prestamoId: number | null;
  adelantoId: number | null;
  observacion: string | null;
}

export interface Nomina extends Base, Partial<Anulacion> {
  periodoId: number;
  periodo?: PeriodoNomina;
  empleadoId: number;
  empleado?: Empleado;
  fechaEmision: string;
  totalPercepciones: number;
  totalDeducciones: number;
  liquidoRecibir: number;
  /** Base del cálculo (null en boletas anteriores al salario mensual). */
  salarioMensual: number | null;
  diasLaborados: number | null;
  diasFalta: number;
  estado: EstadoNomina;
  metodoPago: MetodoPago;
  /** Banco y cuenta guardados en la boleta cuando se paga por depósito. */
  bancoDestino: string | null;
  numeroCuenta: string | null;
  detalles?: NominaDetalle[];
}

export interface PeriodoDetalle extends PeriodoNomina {
  resumen: {
    empleados: number;
    totalPercepciones: number;
    totalDeducciones: number;
    totalLiquido: number;
    nominasConLiquidoNegativo: number;
    boletasAnuladas: number;
    boletasPorConfirmar: number;
    totalEfectivo: number;
    totalDeposito: number;
  };
  nominas: Nomina[];
}

export interface EstadoCuenta {
  empleado: Empleado;
  totalAdelantosPendientes: number;
  totalSaldoPrestamos: number;
  adelantosPendientes: Adelanto[];
  prestamosActivos: Prestamo[];
  ultimasNominas: Nomina[];
}

export interface DashboardResumen {
  empleadosActivos: number;
  empleadosPorFrecuencia: { frecuencia: string; empleados: number; totalSalarios: number; totalMensual: number }[];
  adelantosPendientes: { cantidad: number; total: number };
  prestamosActivos: { cantidad: number; saldo: number };
  periodosPendientes: PeriodoNomina[];
  ultimosPagos: {
    id: number;
    anio: number;
    numeroPeriodo: number;
    fechaPago: string;
    frecuencia: string;
    empleados: number;
    totalPagado: number;
  }[];
}

// ───────────── Reportes (misma estructura que backend/src/reportes/reporte.types.ts) ─────────────

export interface ReporteColumna {
  clave: string;
  titulo: string;
  tipo?: 'texto' | 'dinero' | 'fecha' | 'numero';
  ancho?: number;
}

export interface ReporteTabla {
  titulo?: string;
  columnas: ReporteColumna[];
  filas: Record<string, string | number | null>[];
  totales?: Record<string, number>;
}

export interface Reporte extends ReporteTabla {
  titulo: string;
  subtitulo?: string;
  resumen?: { etiqueta: string; valor: string }[];
  anexos?: ReporteTabla[];
  nombreArchivo: string;
  generado: string;
}
