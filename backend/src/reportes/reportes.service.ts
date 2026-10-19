import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { Between, DataSource, FindOptionsWhere } from 'typeorm';
import { Adelanto } from '../adelantos/entities/adelanto.entity.js';
import { ConceptoSistema, EstadoNomina, EstadoPrestamo, TipoConcepto } from '../common/enums.js';
import { today } from '../common/utils/dates.js';
import { round2 } from '../common/utils/money.js';
import { Empleado } from '../empleados/entities/empleado.entity.js';
import { NominaDetalle } from '../nominas/entities/nomina-detalle.entity.js';
import { NominaEncabezado } from '../nominas/entities/nomina-encabezado.entity.js';
import { PeriodoNomina } from '../periodos-nomina/entities/periodo-nomina.entity.js';
import { Prestamo } from '../prestamos/entities/prestamo.entity.js';
import { ReporteAdelantosDto, ReporteEmpleadosDto, ReportePrestamosDto, RangoFechasDto } from './dto/reporte.dto.js';
import { fechaCorta, textoCelda } from './exportadores/formato.js';
import type { Columna, Fila, Reporte } from './reporte.types.js';

const dinero = (v: number) => textoCelda(v, 'dinero');

/** Suma una columna de las filas (para la fila de totales). */
function sumar(filas: Fila[], ...claves: string[]): Record<string, number> {
  return Object.fromEntries(claves.map((k) => [k, round2(filas.reduce((s, f) => s + Number(f[k] ?? 0), 0))]));
}

function nombre(e: Pick<Empleado, 'nombres' | 'apellidos'>) {
  return `${e.apellidos}, ${e.nombres}`;
}

@Injectable()
export class ReportesService {
  constructor(@InjectDataSource() private readonly db: DataSource) {}

  // ───────────────────────── 1. Planilla del período ─────────────────────────

  /** Lo que se paga a cada empleado en un período, desglosado, más totales por banco. */
  async planilla(periodoId: number): Promise<Reporte> {
    const periodo = await this.db.getRepository(PeriodoNomina).findOne({ where: { id: periodoId } });
    if (!periodo) throw new NotFoundException(`Período ${periodoId} no encontrado`);

    const todas = await this.db.getRepository(NominaEncabezado).find({
      where: { periodoId },
      relations: { empleado: true, detalles: true, anuladoPor: true },
      order: { empleado: { apellidos: 'ASC', nombres: 'ASC' } },
    });
    // La planilla muestra solo las boletas vigentes; las anuladas van en un anexo como historial.
    const nominas = todas.filter((n) => n.estado !== EstadoNomina.ANULADA);
    const anuladas = todas.filter((n) => n.estado === EstadoNomina.ANULADA);

    const filas: Fila[] = nominas.map((n, i) => {
      const suma = (filtro: (d: NominaDetalle) => boolean) =>
        round2(n.detalles.filter(filtro).reduce((s, d) => s + d.monto, 0));
      const codigo = (d: NominaDetalle) => d.concepto.codigo;
      const esSistema = (d: NominaDetalle) => Object.values(ConceptoSistema).includes(codigo(d) as ConceptoSistema);
      return {
        no: i + 1,
        empleado: nombre(n.empleado),
        dpi: n.empleado.dpi,
        puesto: n.empleado.puesto?.nombre ?? '',
        sueldo: suma((d) => codigo(d) === ConceptoSistema.SUELDO_BASE),
        bonos: suma((d) => d.concepto.tipo === TipoConcepto.PERCEPCION && !esSistema(d)),
        adelantos: suma((d) => codigo(d) === ConceptoSistema.ADELANTO),
        prestamos: suma((d) => codigo(d) === ConceptoSistema.PRESTAMO),
        otros: suma((d) => d.concepto.tipo === TipoConcepto.DEDUCCION && !esSistema(d)),
        liquido: n.liquidoRecibir,
        banco: n.empleado.bancoDestino ?? 'Efectivo',
        cuenta: n.empleado.numeroCuenta ?? '',
      };
    });

    const columnas: Columna[] = [
      { clave: 'no', titulo: 'No.', tipo: 'numero', ancho: 0.5 },
      { clave: 'empleado', titulo: 'Empleado', ancho: 2.4 },
      { clave: 'dpi', titulo: 'DPI', ancho: 1.3 },
      { clave: 'puesto', titulo: 'Puesto', ancho: 1.2 },
      { clave: 'sueldo', titulo: 'Sueldo', tipo: 'dinero', ancho: 1.1 },
      { clave: 'bonos', titulo: 'Bonos y otros', tipo: 'dinero', ancho: 1.1 },
      { clave: 'adelantos', titulo: 'Adelantos', tipo: 'dinero', ancho: 1.1 },
      { clave: 'prestamos', titulo: 'Préstamos', tipo: 'dinero', ancho: 1.1 },
      { clave: 'otros', titulo: 'Otros desc.', tipo: 'dinero', ancho: 1.1 },
      { clave: 'liquido', titulo: 'Líquido', tipo: 'dinero', ancho: 1.2 },
      { clave: 'banco', titulo: 'Banco', ancho: 1.3 },
      { clave: 'cuenta', titulo: 'Cuenta', ancho: 1.2 },
    ];
    const totales = sumar(filas, 'sueldo', 'bonos', 'adelantos', 'prestamos', 'otros', 'liquido');

    // Totales por banco: sirve para preparar las transferencias o el efectivo.
    const porBanco = new Map<string, { empleados: number; total: number }>();
    for (const f of filas) {
      const b = porBanco.get(String(f.banco)) ?? { empleados: 0, total: 0 };
      porBanco.set(String(f.banco), { empleados: b.empleados + 1, total: round2(b.total + Number(f.liquido)) });
    }
    const filasBanco: Fila[] = [...porBanco].map(([banco, v]) => ({ banco, ...v }));

    const tipo = periodo.frecuenciaPago.nombre === 'Quincenal' ? 'Quincena' : 'Semana';
    return {
      titulo: `Planilla · ${tipo} ${periodo.numeroPeriodo} de ${periodo.anio}`,
      subtitulo: `Del ${fechaCorta(periodo.fechaInicio)} al ${fechaCorta(periodo.fechaFin)} · Fecha de pago: ${fechaCorta(periodo.fechaPago)} · Estado: ${periodo.estado}`,
      resumen: [
        { etiqueta: 'Empleados', valor: String(filas.length) },
        { etiqueta: 'Total percepciones', valor: dinero(totales.sueldo + totales.bonos) },
        { etiqueta: 'Total descuentos', valor: dinero(totales.adelantos + totales.prestamos + totales.otros) },
        { etiqueta: 'Total a pagar', valor: dinero(totales.liquido) },
        ...(anuladas.length ? [{ etiqueta: 'Boletas anuladas', valor: String(anuladas.length) }] : []),
      ],
      columnas,
      filas,
      totales,
      anexos: [
        {
          titulo: 'Depósitos por banco',
          columnas: [
            { clave: 'banco', titulo: 'Banco', ancho: 3 },
            { clave: 'empleados', titulo: 'Empleados', tipo: 'numero' },
            { clave: 'total', titulo: 'Total a depositar', tipo: 'dinero', ancho: 1.5 },
          ],
          filas: filasBanco,
          totales: sumar(filasBanco, 'empleados', 'total'),
        },
        ...(anuladas.length
          ? [
              {
                titulo: 'Boletas anuladas',
                columnas: [
                  { clave: 'empleado', titulo: 'Empleado', ancho: 2.2 },
                  { clave: 'liquido', titulo: 'Líquido anulado', tipo: 'dinero' as const },
                  { clave: 'fecha', titulo: 'Anulada el', tipo: 'fecha' as const },
                  { clave: 'usuario', titulo: 'Anulada por', ancho: 1.3 },
                  { clave: 'motivo', titulo: 'Motivo', ancho: 3 },
                ],
                filas: anuladas.map((n) => ({
                  empleado: nombre(n.empleado),
                  liquido: n.liquidoRecibir,
                  fecha: n.fechaAnulacion ? n.fechaAnulacion.toISOString().slice(0, 10) : null,
                  usuario: n.anuladoPor ? `${n.anuladoPor.nombre} ${n.anuladoPor.apellido}` : '',
                  motivo: n.motivoAnulacion ?? '',
                })),
              },
            ]
          : []),
      ],
      nombreArchivo: `planilla-${tipo.toLowerCase()}-${periodo.numeroPeriodo}-${periodo.anio}`,
      generado: new Date().toISOString(),
    };
  }

  // ───────────────────────── 2. Pagos por rango de fechas ─────────────────────────

  /** Total pagado a cada empleado en los períodos cerrados con fecha de pago dentro del rango. */
  async pagos(dto: RangoFechasDto): Promise<Reporte> {
    const { desde, hasta } = this.rango(dto);
    const tipo = (codigo: string) => `SUM(CASE WHEN c.codigo = '${codigo}' THEN d.monto ELSE 0 END)`;

    const filasRaw = await this.db
      .getRepository(NominaDetalle)
      .createQueryBuilder('d')
      .innerJoin('d.nomina', 'n')
      .innerJoin('n.periodo', 'p')
      .innerJoin('n.empleado', 'e')
      .innerJoin('e.puesto', 'pu')
      .innerJoin('d.concepto', 'c')
      .select('e.id', 'id')
      .addSelect("e.apellidos || ', ' || e.nombres", 'empleado')
      .addSelect('e.dpi', 'dpi')
      .addSelect('pu.nombre', 'puesto')
      .addSelect('COUNT(DISTINCT n.id)::int', 'pagos')
      .addSelect(`SUM(CASE WHEN c.tipo = '${TipoConcepto.PERCEPCION}' THEN d.monto ELSE 0 END)`, 'percepciones')
      .addSelect(tipo(ConceptoSistema.ADELANTO), 'adelantos')
      .addSelect(tipo(ConceptoSistema.PRESTAMO), 'prestamos')
      .addSelect(
        `SUM(CASE WHEN c.tipo = '${TipoConcepto.DEDUCCION}' AND c.codigo NOT IN ('${ConceptoSistema.ADELANTO}', '${ConceptoSistema.PRESTAMO}') THEN d.monto ELSE 0 END)`,
        'otros',
      )
      .where('n.estado = :pagada', { pagada: EstadoNomina.PAGADA })
      .andWhere('p.fechaPago BETWEEN :desde AND :hasta', { desde, hasta })
      .groupBy('e.id')
      .addGroupBy('pu.nombre')
      .orderBy('e.apellidos')
      .addOrderBy('e.nombres')
      .getRawMany<Record<string, string | number>>();

    const filas: Fila[] = filasRaw.map((r) => {
      const percepciones = round2(Number(r.percepciones));
      const adelantos = round2(Number(r.adelantos));
      const prestamos = round2(Number(r.prestamos));
      const otros = round2(Number(r.otros));
      return {
        empleado: String(r.empleado),
        dpi: String(r.dpi),
        puesto: String(r.puesto),
        pagos: Number(r.pagos),
        percepciones,
        adelantos,
        prestamos,
        otros,
        recibido: round2(percepciones - adelantos - prestamos - otros),
      };
    });
    const totales = sumar(filas, 'pagos', 'percepciones', 'adelantos', 'prestamos', 'otros', 'recibido');

    return {
      titulo: 'Pagos por empleado',
      subtitulo: `Pagos confirmados con fecha de pago del ${fechaCorta(desde)} al ${fechaCorta(hasta)}`,
      resumen: [
        { etiqueta: 'Empleados pagados', valor: String(filas.length) },
        { etiqueta: 'Total percepciones', valor: dinero(totales.percepciones) },
        { etiqueta: 'Total descontado', valor: dinero(totales.adelantos + totales.prestamos + totales.otros) },
        { etiqueta: 'Total pagado', valor: dinero(totales.recibido) },
      ],
      columnas: [
        { clave: 'empleado', titulo: 'Empleado', ancho: 2.4 },
        { clave: 'dpi', titulo: 'DPI', ancho: 1.3 },
        { clave: 'puesto', titulo: 'Puesto', ancho: 1.2 },
        { clave: 'pagos', titulo: 'Pagos', tipo: 'numero', ancho: 0.6 },
        { clave: 'percepciones', titulo: 'Percepciones', tipo: 'dinero', ancho: 1.2 },
        { clave: 'adelantos', titulo: 'Adelantos', tipo: 'dinero', ancho: 1.1 },
        { clave: 'prestamos', titulo: 'Préstamos', tipo: 'dinero', ancho: 1.1 },
        { clave: 'otros', titulo: 'Otros desc.', tipo: 'dinero', ancho: 1.1 },
        { clave: 'recibido', titulo: 'Total recibido', tipo: 'dinero', ancho: 1.2 },
      ],
      filas,
      totales,
      nombreArchivo: `pagos-${desde}-a-${hasta}`,
      generado: new Date().toISOString(),
    };
  }

  // ───────────────────────── 3. Adelantos ─────────────────────────

  async adelantos(dto: ReporteAdelantosDto): Promise<Reporte> {
    const { desde, hasta } = this.rango(dto);
    const where: FindOptionsWhere<Adelanto> = { fechaSolicitud: Between(desde, hasta) };
    if (dto.estado) where.aplicado = dto.estado === 'DESCONTADO';

    const lista = await this.db.getRepository(Adelanto).find({
      where,
      relations: { empleado: true },
      order: { fechaSolicitud: 'ASC', id: 'ASC' },
    });
    const filas: Fila[] = lista.map((a) => ({
      fecha: a.fechaSolicitud,
      empleado: nombre(a.empleado),
      dpi: a.empleado.dpi,
      monto: a.monto,
      estado: a.aplicado ? 'Descontado' : 'Pendiente',
      observacion: a.observacion ?? '',
    }));
    const pendiente = round2(lista.filter((a) => !a.aplicado).reduce((s, a) => s + a.monto, 0));
    const descontado = round2(lista.filter((a) => a.aplicado).reduce((s, a) => s + a.monto, 0));

    return {
      titulo: 'Adelantos',
      subtitulo:
        `Solicitados del ${fechaCorta(desde)} al ${fechaCorta(hasta)}` +
        (dto.estado ? ` · Solo ${dto.estado === 'PENDIENTE' ? 'pendientes' : 'descontados'}` : ''),
      resumen: [
        { etiqueta: 'Cantidad', valor: String(lista.length) },
        { etiqueta: 'Pendiente de descontar', valor: dinero(pendiente) },
        { etiqueta: 'Ya descontado', valor: dinero(descontado) },
      ],
      columnas: [
        { clave: 'fecha', titulo: 'Fecha', tipo: 'fecha', ancho: 0.9 },
        { clave: 'empleado', titulo: 'Empleado', ancho: 2.2 },
        { clave: 'dpi', titulo: 'DPI', ancho: 1.2 },
        { clave: 'monto', titulo: 'Monto', tipo: 'dinero', ancho: 1 },
        { clave: 'estado', titulo: 'Estado', ancho: 0.9 },
        { clave: 'observacion', titulo: 'Observación', ancho: 2 },
      ],
      filas,
      totales: sumar(filas, 'monto'),
      nombreArchivo: `adelantos-${desde}-a-${hasta}`,
      generado: new Date().toISOString(),
    };
  }

  // ───────────────────────── 4. Cartera de préstamos ─────────────────────────

  async prestamos(dto: ReportePrestamosDto): Promise<Reporte> {
    const where: FindOptionsWhere<Prestamo> = {};
    if (dto.estado) where.estado = dto.estado;
    const lista = await this.db.getRepository(Prestamo).find({
      where,
      relations: { empleado: true },
      order: { fechaSolicitud: 'ASC', id: 'ASC' },
    });

    const filas: Fila[] = lista.map((p) => ({
      fecha: p.fechaSolicitud,
      empleado: nombre(p.empleado),
      monto: p.montoTotal,
      cuota: p.montoCuota,
      pagado: round2(p.montoTotal - p.saldoPendiente),
      saldo: p.saldoPendiente,
      cuotas: p.estado === EstadoPrestamo.ACTIVO ? Math.ceil(p.saldoPendiente / p.montoCuota) : 0,
      estado: p.estado.charAt(0) + p.estado.slice(1).toLowerCase(),
    }));
    const totales = sumar(filas, 'monto', 'pagado', 'saldo');
    const porCobrar = round2(
      lista.filter((p) => p.estado === EstadoPrestamo.ACTIVO).reduce((s, p) => s + p.saldoPendiente, 0),
    );

    return {
      titulo: 'Cartera de préstamos',
      subtitulo: dto.estado ? `Préstamos en estado ${dto.estado}` : 'Todos los préstamos',
      resumen: [
        { etiqueta: 'Préstamos', valor: String(lista.length) },
        { etiqueta: 'Total prestado', valor: dinero(totales.monto) },
        { etiqueta: 'Recuperado', valor: dinero(totales.pagado) },
        { etiqueta: 'Saldo por cobrar (activos)', valor: dinero(porCobrar) },
      ],
      columnas: [
        { clave: 'fecha', titulo: 'Fecha', tipo: 'fecha', ancho: 0.9 },
        { clave: 'empleado', titulo: 'Empleado', ancho: 2.2 },
        { clave: 'monto', titulo: 'Prestado', tipo: 'dinero' },
        { clave: 'cuota', titulo: 'Cuota', tipo: 'dinero' },
        { clave: 'pagado', titulo: 'Pagado', tipo: 'dinero' },
        { clave: 'saldo', titulo: 'Saldo', tipo: 'dinero' },
        { clave: 'cuotas', titulo: 'Cuotas restantes', tipo: 'numero', ancho: 0.9 },
        { clave: 'estado', titulo: 'Estado', ancho: 0.8 },
      ],
      filas,
      totales,
      nombreArchivo: `prestamos-${dto.estado?.toLowerCase() ?? 'todos'}-${today()}`,
      generado: new Date().toISOString(),
    };
  }

  // ───────────────────────── 5. Listado de empleados ─────────────────────────

  async empleados(dto: ReporteEmpleadosDto): Promise<Reporte> {
    const where: FindOptionsWhere<Empleado> = {};
    if (dto.estado) where.estado = dto.estado;
    const lista = await this.db.getRepository(Empleado).find({ where, order: { apellidos: 'ASC', nombres: 'ASC' } });

    const filas: Fila[] = lista.map((e) => ({
      empleado: nombre(e),
      dpi: e.dpi,
      puesto: e.puesto.nombre,
      frecuencia: e.frecuenciaPago.nombre,
      salario: e.salarioBase,
      ingreso: e.fechaIngreso,
      telefono: e.telefono ?? '',
      banco: e.bancoDestino ?? 'Efectivo',
      cuenta: e.numeroCuenta ?? '',
      estado: e.estado === 'ACTIVO' ? 'Activo' : 'Inactivo',
    }));
    const planilla = (frecuencia: string) =>
      dinero(
        lista
          .filter((e) => e.estado === 'ACTIVO' && e.frecuenciaPago.nombre === frecuencia)
          .reduce((s, e) => s + e.salarioBase, 0),
      );

    return {
      titulo: 'Listado de empleados',
      subtitulo: dto.estado ? `Empleados ${dto.estado === 'ACTIVO' ? 'activos' : 'inactivos'}` : 'Todos los empleados',
      resumen: [
        { etiqueta: 'Empleados', valor: String(lista.length) },
        { etiqueta: 'Planilla semanal (activos)', valor: planilla('Semanal') },
        { etiqueta: 'Planilla quincenal (activos)', valor: planilla('Quincenal') },
      ],
      columnas: [
        { clave: 'empleado', titulo: 'Empleado', ancho: 2.2 },
        { clave: 'dpi', titulo: 'DPI', ancho: 1.3 },
        { clave: 'puesto', titulo: 'Puesto', ancho: 1.2 },
        { clave: 'frecuencia', titulo: 'Pago', ancho: 0.9 },
        { clave: 'salario', titulo: 'Salario por pago', tipo: 'dinero', ancho: 1.1 },
        { clave: 'ingreso', titulo: 'Ingreso', tipo: 'fecha', ancho: 0.9 },
        { clave: 'telefono', titulo: 'Teléfono', ancho: 1 },
        { clave: 'banco', titulo: 'Banco', ancho: 1.2 },
        { clave: 'cuenta', titulo: 'Cuenta', ancho: 1.1 },
        { clave: 'estado', titulo: 'Estado', ancho: 0.8 },
      ],
      filas,
      nombreArchivo: `empleados-${dto.estado?.toLowerCase() ?? 'todos'}-${today()}`,
      generado: new Date().toISOString(),
    };
  }

  /** Rango de fechas con valores por defecto: del primer día del mes actual hasta hoy. */
  private rango(dto: RangoFechasDto) {
    const hoy = today();
    const desde = dto.desde ?? `${hoy.slice(0, 8)}01`;
    const hasta = dto.hasta ?? hoy;
    if (desde > hasta) throw new BadRequestException('La fecha "desde" no puede ser posterior a "hasta"');
    return { desde, hasta };
  }
}
