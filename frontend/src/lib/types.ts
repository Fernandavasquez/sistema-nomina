// Tipos que reflejan las respuestas de la API (ver entidades del backend).

export type RolNombre = 'ADMIN' | 'OPERADOR';
export type EstadoEmpleado = 'ACTIVO' | 'INACTIVO';
export type EstadoPrestamo = 'ACTIVO' | 'PAGADO' | 'CANCELADO';
export type EstadoPeriodo = 'ABIERTO' | 'PROCESADO' | 'CERRADO';
export type EstadoNomina = 'GENERADA' | 'PAGADA';
export type TipoConcepto = 'PERCEPCION' | 'DEDUCCION';

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
  salarioBase: number;
  bancoDestino: string | null;
  numeroCuenta: string | null;
  fotoDpi: string | null;
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

export interface PeriodoNomina extends Base {
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

export interface Nomina extends Base {
  periodoId: number;
  periodo?: PeriodoNomina;
  empleadoId: number;
  empleado?: Empleado;
  fechaEmision: string;
  totalPercepciones: number;
  totalDeducciones: number;
  liquidoRecibir: number;
  estado: EstadoNomina;
  detalles?: NominaDetalle[];
}

export interface PeriodoDetalle extends PeriodoNomina {
  resumen: {
    empleados: number;
    totalPercepciones: number;
    totalDeducciones: number;
    totalLiquido: number;
    nominasConLiquidoNegativo: number;
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
  empleadosPorFrecuencia: { frecuencia: string; empleados: number; totalSalarios: number }[];
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
