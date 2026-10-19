import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, FindOptionsWhere, In, LessThanOrEqual, MoreThan, Not, Repository } from 'typeorm';
import { Adelanto } from '../adelantos/entities/adelanto.entity.js';
import {
  ConceptoSistema,
  EstadoEmpleado,
  EstadoNomina,
  EstadoPeriodo,
  EstadoPrestamo,
  FrecuenciaCodigo,
  MetodoPago,
} from '../common/enums.js';
import { addDays, today, toDate } from '../common/utils/dates.js';
import { round2 } from '../common/utils/money.js';
import { ConceptoNomina } from '../conceptos-nomina/entities/concepto-nomina.entity.js';
import { Empleado } from '../empleados/entities/empleado.entity.js';
import { TipoFrecuenciaPago } from '../frecuencias-pago/entities/tipo-frecuencia-pago.entity.js';
import { NominaDetalle } from '../nominas/entities/nomina-detalle.entity.js';
import { NominaEncabezado } from '../nominas/entities/nomina-encabezado.entity.js';
import { datosPago, tieneCuenta } from '../nominas/metodo-pago.js';
import { calcularTotales } from '../nominas/nomina-calculo.js';
import { Prestamo } from '../prestamos/entities/prestamo.entity.js';
import { CreatePeriodoNominaDto, FiltroPeriodosDto, UpdatePeriodoNominaDto } from './dto/periodo-nomina.dto.js';
import { PeriodoNomina } from './entities/periodo-nomina.entity.js';
import { ajustarInicioQuincena, calcularFechaFin } from './periodo-fechas.js';

type ConceptosSistema = Record<ConceptoSistema, ConceptoNomina>;

@Injectable()
export class PeriodosNominaService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(PeriodoNomina) private readonly periodos: Repository<PeriodoNomina>,
    @InjectRepository(TipoFrecuenciaPago) private readonly frecuencias: Repository<TipoFrecuenciaPago>,
    @InjectRepository(NominaEncabezado) private readonly nominas: Repository<NominaEncabezado>,
  ) {}

  // ───────────────────────────── Consultas ─────────────────────────────

  findAll(filtro: FiltroPeriodosDto) {
    const where: FindOptionsWhere<PeriodoNomina> = {};
    if (filtro.frecuenciaPagoId) where.frecuenciaPagoId = filtro.frecuenciaPagoId;
    if (filtro.anio) where.anio = filtro.anio;
    if (filtro.estado) where.estado = filtro.estado;
    return this.periodos.find({ where, order: { fechaInicio: 'DESC', frecuenciaPagoId: 'ASC' } });
  }

  async findOne(id: number) {
    const periodo = await this.periodos.findOne({
      where: { id },
      // La contraseña del usuario nunca se lee (columna con select: false).
      relations: { anuladoPor: true },
    });
    if (!periodo) throw new NotFoundException(`Período ${id} no encontrado`);
    return periodo;
  }

  /**
   * Período + sus boletas + totales. Los totales solo cuentan las boletas vigentes
   * (las anuladas se muestran aparte, como historial).
   */
  async detalle(id: number) {
    const periodo = await this.findOne(id);
    const nominas = await this.nominas.find({
      where: { periodoId: id },
      relations: { empleado: true, anuladoPor: true },
      order: { empleado: { apellidos: 'ASC', nombres: 'ASC' }, id: 'ASC' },
    });
    const vigentes = nominas.filter((n) => n.estado !== EstadoNomina.ANULADA);
    return {
      ...periodo,
      resumen: {
        empleados: vigentes.length,
        totalPercepciones: round2(vigentes.reduce((s, n) => s + n.totalPercepciones, 0)),
        totalDeducciones: round2(vigentes.reduce((s, n) => s + n.totalDeducciones, 0)),
        totalLiquido: round2(vigentes.reduce((s, n) => s + n.liquidoRecibir, 0)),
        nominasConLiquidoNegativo: vigentes.filter((n) => n.liquidoRecibir < 0).length,
        totalEfectivo: round2(
          vigentes.filter((n) => n.metodoPago === MetodoPago.EFECTIVO).reduce((s, n) => s + n.liquidoRecibir, 0),
        ),
        totalDeposito: round2(
          vigentes.filter((n) => n.metodoPago === MetodoPago.DEPOSITO).reduce((s, n) => s + n.liquidoRecibir, 0),
        ),
        boletasAnuladas: nominas.length - vigentes.length,
        // Boletas nuevas emitidas en un período ya pagado, que falta confirmar.
        boletasPorConfirmar:
          periodo.estado === EstadoPeriodo.CERRADO
            ? vigentes.filter((n) => n.estado === EstadoNomina.GENERADA).length
            : 0,
      },
      nominas,
    };
  }

  /** Propone las fechas del siguiente período (continúa después del último no anulado). */
  async sugerencia(frecuenciaPagoId: number) {
    const frecuencia = await this.getFrecuencia(frecuenciaPagoId);
    const ultimo = await this.periodos.findOne({
      where: { frecuenciaPagoId, estado: Not(EstadoPeriodo.ANULADO) },
      order: { fechaFin: 'DESC' },
    });
    let fechaInicio = ultimo ? addDays(ultimo.fechaFin, 1) : today();
    if (frecuencia.codigo === FrecuenciaCodigo.QUINCENAL) fechaInicio = ajustarInicioQuincena(fechaInicio);
    const fechaFin = calcularFechaFin(frecuencia.codigo, frecuencia.diasPeriodo, fechaInicio);
    return { frecuenciaPagoId, fechaInicio, fechaFin, fechaPago: fechaFin };
  }

  // ───────────────────────────── CRUD ─────────────────────────────

  async create(dto: CreatePeriodoNominaDto) {
    const frecuencia = await this.getFrecuencia(dto.frecuenciaPagoId);
    const fechaFin = dto.fechaFin ?? calcularFechaFin(frecuencia.codigo, frecuencia.diasPeriodo, dto.fechaInicio);
    const fechaPago = dto.fechaPago ?? fechaFin;
    this.validarFechas(dto.fechaInicio, fechaFin, fechaPago);
    await this.assertSinTraslape(dto.frecuenciaPagoId, dto.fechaInicio, fechaFin);

    const anio = toDate(dto.fechaInicio).getUTCFullYear();
    const periodo = this.periodos.create({
      frecuenciaPagoId: dto.frecuenciaPagoId,
      anio,
      numeroPeriodo: await this.siguienteNumero(dto.frecuenciaPagoId, anio, dto.fechaInicio),
      fechaInicio: dto.fechaInicio,
      fechaFin,
      fechaPago,
      estado: EstadoPeriodo.ABIERTO,
    });
    const { id } = await this.periodos.save(periodo);
    return this.findOne(id);
  }

  async update(id: number, dto: UpdatePeriodoNominaDto) {
    const periodo = await this.findOne(id);
    if (periodo.estado === EstadoPeriodo.CERRADO || periodo.estado === EstadoPeriodo.ANULADO) {
      throw new ConflictException('Un período cerrado o anulado no se puede modificar');
    }
    if ((dto.fechaInicio || dto.fechaFin) && periodo.estado !== EstadoPeriodo.ABIERTO) {
      throw new ConflictException('Las fechas del período solo se cambian mientras está ABIERTO');
    }
    const fechaInicio = dto.fechaInicio ?? periodo.fechaInicio;
    const fechaFin = dto.fechaFin ?? periodo.fechaFin;
    const fechaPago = dto.fechaPago ?? periodo.fechaPago;
    this.validarFechas(fechaInicio, fechaFin, fechaPago);
    await this.assertSinTraslape(periodo.frecuenciaPagoId, fechaInicio, fechaFin, id);

    await this.periodos.update(id, { fechaInicio, fechaFin, fechaPago });
    return this.findOne(id);
  }

  async remove(id: number) {
    const periodo = await this.findOne(id);
    if (periodo.estado !== EstadoPeriodo.ABIERTO) {
      throw new ConflictException('Solo se pueden eliminar períodos ABIERTOS (revierta el procesamiento primero)');
    }
    await this.periodos.remove(periodo);
    return { message: 'Período eliminado' };
  }

  // ───────────────────────────── Flujo de nómina ─────────────────────────────

  /**
   * PROCESAR: genera (o regenera) la nómina de cada empleado activo con esa frecuencia.
   *  + SUELDO_BASE  = salario del período
   *  − ADELANTO     = cada adelanto pendiente solicitado hasta la fecha fin
   *  − PRESTAMO     = cuota de cada préstamo activo (o el saldo, si es menor)
   * Los bonos/descuentos manuales agregados antes se conservan al reprocesar.
   * Todavía NO se marcan adelantos ni se rebajan préstamos: eso ocurre al CERRAR.
   */
  async procesar(id: number) {
    await this.dataSource.transaction(async (manager) => {
      const periodo = await this.bloquearPeriodo(manager, id);
      if (periodo.estado === EstadoPeriodo.CERRADO || periodo.estado === EstadoPeriodo.ANULADO) {
        throw new ConflictException('El período ya está cerrado o anulado');
      }
      await this.assertSinOtroEnProceso(manager, periodo.frecuenciaPagoId, id);
      await this.assertSinBoletasPorConfirmar(manager, periodo.frecuenciaPagoId);

      const conceptos = await this.conceptosSistema(manager);
      const empleados = await manager.find(Empleado, {
        where: {
          frecuenciaPagoId: periodo.frecuenciaPagoId,
          estado: EstadoEmpleado.ACTIVO,
          fechaIngreso: LessThanOrEqual(periodo.fechaFin),
        },
      });
      if (!empleados.length) {
        throw new BadRequestException('No hay empleados activos con esta frecuencia de pago para el período');
      }
      const empleadoIds = empleados.map((e) => e.id);
      const existentes = await manager.find(NominaEncabezado, { where: { periodoId: id } });

      // Empleados que ya no aplican (inactivados o cambiados de frecuencia): se elimina su nómina.
      const sobrantes = existentes.filter((n) => !empleadoIds.includes(n.empleadoId));
      if (sobrantes.length) await manager.delete(NominaEncabezado, { id: In(sobrantes.map((n) => n.id)) });

      const idsConceptosSistema = Object.values(conceptos).map((c) => c.id);
      for (const empleado of empleados) {
        let nomina = existentes.find((n) => n.empleadoId === empleado.id);
        if (nomina) {
          // Se recalculan las líneas automáticas; los bonos/descuentos manuales se conservan.
          await manager.delete(NominaDetalle, { nominaId: nomina.id, conceptoId: In(idsConceptosSistema) });
          // Se respeta la forma de pago elegida; en depósito se actualizan banco y cuenta
          // (si el empleado ya no tiene cuenta registrada, pasa a efectivo).
          if (nomina.metodoPago === MetodoPago.DEPOSITO) {
            await manager.update(
              NominaEncabezado,
              nomina.id,
              datosPago(empleado, tieneCuenta(empleado) ? MetodoPago.DEPOSITO : MetodoPago.EFECTIVO),
            );
          }
        } else {
          nomina = await manager.save(
            manager.create(NominaEncabezado, {
              periodoId: id,
              empleadoId: empleado.id,
              fechaEmision: today(),
              estado: EstadoNomina.GENERADA,
              ...datosPago(empleado),
            }),
          );
        }
        await this.generarLineas(manager, nomina.id, empleado, periodo, conceptos);
      }

      await manager.update(PeriodoNomina, id, { estado: EstadoPeriodo.PROCESADO });
    });
    return this.detalle(id);
  }

  /**
   * CERRAR: confirma el pago. Marca los adelantos como aplicados, rebaja el saldo de los
   * préstamos (y los marca PAGADO al llegar a 0) y bloquea el período.
   */
  async cerrar(id: number) {
    await this.dataSource.transaction(async (manager) => {
      const periodo = await this.bloquearPeriodo(manager, id);
      if (periodo.estado !== EstadoPeriodo.PROCESADO) {
        throw new ConflictException('Solo se puede cerrar un período PROCESADO');
      }

      const nominas = await manager.find(NominaEncabezado, {
        where: { periodoId: id, estado: EstadoNomina.GENERADA },
        relations: { detalles: true },
      });
      const negativas = nominas.filter((n) => n.liquidoRecibir < 0).length;
      if (negativas) {
        throw new BadRequestException(
          `Hay ${negativas} nómina(s) con líquido negativo. Ajuste los descuentos antes de cerrar el período.`,
        );
      }

      await this.aplicarPago(manager, nominas);
      await manager.update(PeriodoNomina, id, { estado: EstadoPeriodo.CERRADO });
    });
    return this.detalle(id);
  }

  /** REVERTIR: vuelve un período PROCESADO a ABIERTO eliminando sus nóminas calculadas. */
  async revertir(id: number) {
    await this.dataSource.transaction(async (manager) => {
      const periodo = await this.bloquearPeriodo(manager, id);
      if (periodo.estado !== EstadoPeriodo.PROCESADO) {
        throw new ConflictException('Solo se puede revertir un período PROCESADO');
      }
      await manager.delete(NominaEncabezado, { periodoId: id });
      await manager.update(PeriodoNomina, id, { estado: EstadoPeriodo.ABIERTO });
    });
    return this.detalle(id);
  }

  // ───────────────────────────── Anulaciones ─────────────────────────────

  /**
   * ANULAR PERÍODO (ya pagado): deshace el efecto del pago de todas sus boletas
   * (adelantos vuelven a pendientes, préstamos recuperan su saldo) y deja el período
   * y sus boletas como ANULADOS, con motivo, usuario y fecha. Luego se puede crear
   * un período nuevo con las mismas fechas.
   */
  async anular(id: number, motivo: string, usuarioId: number) {
    await this.dataSource.transaction(async (manager) => {
      const periodo = await this.bloquearPeriodo(manager, id);
      if (periodo.estado !== EstadoPeriodo.CERRADO) {
        throw new ConflictException(
          'Solo se anulan períodos CERRADOS (pagados). Un período en revisión se revierte; uno abierto se elimina.',
        );
      }
      await this.assertSinOtroEnProceso(manager, periodo.frecuenciaPagoId);

      const nominas = await manager.find(NominaEncabezado, { where: { periodoId: id }, relations: { detalles: true } });
      // Boletas nuevas aún sin confirmar: no se llegaron a pagar, simplemente se descartan.
      const porConfirmar = nominas.filter((n) => n.estado === EstadoNomina.GENERADA);
      if (porConfirmar.length) await manager.delete(NominaEncabezado, { id: In(porConfirmar.map((n) => n.id)) });

      const pagadas = nominas.filter((n) => n.estado === EstadoNomina.PAGADA);
      await this.revertirPago(manager, pagadas);

      const anulacion = { motivoAnulacion: motivo, fechaAnulacion: new Date(), anuladoPorId: usuarioId };
      if (pagadas.length) {
        await manager.update(
          NominaEncabezado,
          { id: In(pagadas.map((n) => n.id)) },
          { estado: EstadoNomina.ANULADA, ...anulacion },
        );
      }
      await manager.update(PeriodoNomina, id, { estado: EstadoPeriodo.ANULADO, ...anulacion });
    });
    return this.detalle(id);
  }

  /** ANULAR BOLETA (ya pagada) de un solo empleado, sin tocar a los demás. */
  async anularNomina(nominaId: number, motivo: string, usuarioId: number) {
    const periodoId = await this.dataSource.transaction(async (manager) => {
      const nomina = await this.bloquearNomina(manager, nominaId);
      const periodo = await this.bloquearPeriodo(manager, nomina.periodoId);
      if (nomina.estado !== EstadoNomina.PAGADA || periodo.estado !== EstadoPeriodo.CERRADO) {
        throw new ConflictException('Solo se anulan boletas pagadas de un período CERRADO');
      }
      await this.assertSinOtroEnProceso(manager, periodo.frecuenciaPagoId);

      await this.revertirPago(manager, [nomina]);
      await manager.update(NominaEncabezado, nominaId, {
        estado: EstadoNomina.ANULADA,
        motivoAnulacion: motivo,
        fechaAnulacion: new Date(),
        anuladoPorId: usuarioId,
      });
      return periodo.id;
    });
    return this.detalle(periodoId);
  }

  /**
   * EMITIR BOLETA NUEVA para un empleado cuya boleta se anuló en un período ya pagado.
   * Se calcula igual que al procesar (sueldo, adelantos pendientes, cuotas de préstamos),
   * queda GENERADA para revisarla (bonos/descuentos) y luego se confirma su pago.
   */
  async reemitir(periodoId: number, empleadoId: number) {
    const nominaId = await this.dataSource.transaction(async (manager) => {
      const periodo = await this.bloquearPeriodo(manager, periodoId);
      if (periodo.estado !== EstadoPeriodo.CERRADO) {
        throw new ConflictException('Solo se emite una boleta nueva en un período CERRADO');
      }
      await this.assertSinOtroEnProceso(manager, periodo.frecuenciaPagoId);

      const boletas = await manager.find(NominaEncabezado, { where: { periodoId, empleadoId } });
      if (!boletas.some((n) => n.estado === EstadoNomina.ANULADA)) {
        throw new BadRequestException('El empleado no tiene una boleta anulada en este período');
      }
      if (boletas.some((n) => n.estado !== EstadoNomina.ANULADA)) {
        throw new ConflictException('El empleado ya tiene una boleta vigente en este período');
      }
      // Evita incluir dos veces el mismo adelanto en boletas pendientes de distintos períodos.
      const pendienteEnOtro = await manager.exists(NominaEncabezado, {
        where: { empleadoId, estado: EstadoNomina.GENERADA },
      });
      if (pendienteEnOtro) {
        throw new ConflictException(
          'El empleado tiene otra boleta pendiente de confirmar. Confírmela o descártela primero.',
        );
      }

      const empleado = await manager.findOneBy(Empleado, { id: empleadoId });
      if (!empleado) throw new NotFoundException(`Empleado ${empleadoId} no encontrado`);
      const nomina = await manager.save(
        manager.create(NominaEncabezado, {
          periodoId,
          empleadoId,
          fechaEmision: today(),
          estado: EstadoNomina.GENERADA,
          ...datosPago(empleado),
        }),
      );
      await this.generarLineas(manager, nomina.id, empleado, periodo, await this.conceptosSistema(manager));
      return nomina.id;
    });
    return { nominaId, periodo: await this.detalle(periodoId) };
  }

  /** CONFIRMAR PAGO de una boleta emitida en un período ya cerrado. */
  async confirmarNomina(nominaId: number) {
    const periodoId = await this.dataSource.transaction(async (manager) => {
      const nomina = await this.bloquearNomina(manager, nominaId);
      const periodo = await this.bloquearPeriodo(manager, nomina.periodoId);
      if (nomina.estado !== EstadoNomina.GENERADA || periodo.estado !== EstadoPeriodo.CERRADO) {
        throw new ConflictException('Solo se confirman boletas nuevas de un período CERRADO');
      }
      if (nomina.liquidoRecibir < 0) {
        throw new BadRequestException('La boleta tiene líquido negativo. Ajuste los descuentos antes de confirmar.');
      }
      await this.aplicarPago(manager, [nomina]);
      return periodo.id;
    });
    return this.detalle(periodoId);
  }

  /** DESCARTAR una boleta nueva que aún no se confirmó (no tuvo efectos, se elimina). */
  async descartarNomina(nominaId: number) {
    const periodoId = await this.dataSource.transaction(async (manager) => {
      const nomina = await this.bloquearNomina(manager, nominaId);
      const periodo = await this.bloquearPeriodo(manager, nomina.periodoId);
      if (nomina.estado !== EstadoNomina.GENERADA || periodo.estado !== EstadoPeriodo.CERRADO) {
        throw new ConflictException('Solo se descartan boletas nuevas sin confirmar de un período CERRADO');
      }
      await manager.delete(NominaEncabezado, nominaId);
      return periodo.id;
    });
    return this.detalle(periodoId);
  }

  // ───────────────────────────── Auxiliares ─────────────────────────────

  /** Recalcula los totales del encabezado a partir de sus líneas de detalle. */
  async recalcular(manager: EntityManager, nominaId: number) {
    const lineas = await manager.find(NominaDetalle, { where: { nominaId } });
    await manager.update(NominaEncabezado, nominaId, calcularTotales(lineas));
  }

  /** Crea las líneas automáticas de una boleta: sueldo, adelantos pendientes y cuotas de préstamos. */
  private async generarLineas(
    manager: EntityManager,
    nominaId: number,
    empleado: Empleado,
    periodo: PeriodoNomina,
    conceptos: ConceptosSistema,
  ) {
    const [adelantos, prestamos] = await Promise.all([
      manager.find(Adelanto, {
        where: { empleadoId: empleado.id, aplicado: false, fechaSolicitud: LessThanOrEqual(periodo.fechaFin) },
        order: { fechaSolicitud: 'ASC' },
      }),
      manager.find(Prestamo, {
        where: {
          empleadoId: empleado.id,
          estado: EstadoPrestamo.ACTIVO,
          saldoPendiente: MoreThan(0),
          fechaSolicitud: LessThanOrEqual(periodo.fechaFin),
        },
        order: { fechaSolicitud: 'ASC' },
      }),
    ]);

    const lineas: Partial<NominaDetalle>[] = [
      { conceptoId: conceptos.SUELDO_BASE.id, monto: empleado.salarioBase },
      ...adelantos.map((a) => ({
        conceptoId: conceptos.ADELANTO.id,
        monto: a.monto,
        adelantoId: a.id,
        observacion: `Adelanto del ${a.fechaSolicitud}`,
      })),
      ...prestamos.map((p) => ({
        conceptoId: conceptos.PRESTAMO.id,
        monto: round2(Math.min(p.montoCuota, p.saldoPendiente)),
        prestamoId: p.id,
        observacion: `Cuota préstamo #${p.id} (saldo antes del pago: Q${p.saldoPendiente})`,
      })),
    ];
    await manager.save(lineas.map((l) => manager.create(NominaDetalle, { ...l, nominaId })));
    await this.recalcular(manager, nominaId);
  }

  /** Efecto de pagar boletas: adelantos aplicados, saldos de préstamos rebajados, boletas PAGADAS. */
  private async aplicarPago(manager: EntityManager, nominas: NominaEncabezado[]) {
    await this.moverSaldos(manager, nominas, 'pagar');
    if (nominas.length) {
      await manager.update(NominaEncabezado, { id: In(nominas.map((n) => n.id)) }, { estado: EstadoNomina.PAGADA });
    }
  }

  /** Lo contrario de aplicarPago: adelantos vuelven a pendientes y los préstamos recuperan su saldo. */
  private async revertirPago(manager: EntityManager, nominas: NominaEncabezado[]) {
    await this.moverSaldos(manager, nominas, 'revertir');
  }

  private async moverSaldos(manager: EntityManager, nominas: NominaEncabezado[], accion: 'pagar' | 'revertir') {
    const detalles = nominas.length
      ? await manager.find(NominaDetalle, { where: { nominaId: In(nominas.map((n) => n.id)) } })
      : [];

    const adelantoIds = detalles.filter((d) => d.adelantoId).map((d) => d.adelantoId!);
    if (adelantoIds.length) {
      await manager.update(Adelanto, { id: In(adelantoIds) }, { aplicado: accion === 'pagar' });
    }

    const abonos = detalles.filter((d) => d.prestamoId);
    if (!abonos.length) return;
    const prestamos = await manager.find(Prestamo, {
      where: { id: In(abonos.map((d) => d.prestamoId!)) },
      lock: { mode: 'pessimistic_write' },
    });
    for (const prestamo of prestamos) {
      const monto = abonos.filter((d) => d.prestamoId === prestamo.id).reduce((s, d) => s + d.monto, 0);
      if (accion === 'pagar') {
        const saldo = Math.max(round2(prestamo.saldoPendiente - monto), 0);
        await manager.update(Prestamo, prestamo.id, {
          saldoPendiente: saldo,
          estado: saldo === 0 ? EstadoPrestamo.PAGADO : prestamo.estado,
        });
      } else {
        // Un préstamo que había quedado pagado vuelve a estar activo (uno cancelado sigue cancelado).
        const saldo = Math.min(round2(prestamo.saldoPendiente + monto), prestamo.montoTotal);
        await manager.update(Prestamo, prestamo.id, {
          saldoPendiente: saldo,
          estado: prestamo.estado === EstadoPrestamo.PAGADO ? EstadoPrestamo.ACTIVO : prestamo.estado,
        });
      }
    }
  }

  /** Bloquea la fila del período durante la transacción para evitar procesar/cerrar dos veces a la vez. */
  private async bloquearPeriodo(manager: EntityManager, id: number) {
    const periodo = await manager.findOne(PeriodoNomina, {
      where: { id },
      lock: { mode: 'pessimistic_write' },
      loadEagerRelations: false,
    });
    if (!periodo) throw new NotFoundException(`Período ${id} no encontrado`);
    return periodo;
  }

  private async bloquearNomina(manager: EntityManager, id: number) {
    const nomina = await manager.findOne(NominaEncabezado, {
      where: { id },
      lock: { mode: 'pessimistic_write' },
      loadEagerRelations: false,
    });
    if (!nomina) throw new NotFoundException(`Boleta ${id} no encontrada`);
    return nomina;
  }

  /**
   * Solo puede haber un período PROCESADO por frecuencia: así un adelanto o una cuota
   * nunca se incluye en dos pagos a la vez. Las anulaciones también lo exigen, porque
   * devuelven adelantos y saldos que un período en revisión no tendría en cuenta.
   */
  private async assertSinOtroEnProceso(manager: EntityManager, frecuenciaPagoId: number, exceptoId?: number) {
    const otroEnProceso = await manager.exists(PeriodoNomina, {
      where: {
        frecuenciaPagoId,
        estado: EstadoPeriodo.PROCESADO,
        ...(exceptoId ? { id: Not(exceptoId) } : {}),
      },
    });
    if (otroEnProceso) {
      throw new ConflictException(
        'Hay un período de esta frecuencia en estado PROCESADO. Ciérrelo o reviértalo antes de continuar.',
      );
    }
  }

  /** Una boleta nueva sin confirmar ya "reservó" adelantos y cuotas: hay que confirmarla o descartarla antes. */
  private async assertSinBoletasPorConfirmar(manager: EntityManager, frecuenciaPagoId: number) {
    const pendiente = await manager.exists(NominaEncabezado, {
      where: {
        estado: EstadoNomina.GENERADA,
        periodo: { frecuenciaPagoId, estado: EstadoPeriodo.CERRADO },
      },
    });
    if (pendiente) {
      throw new ConflictException(
        'Hay una boleta nueva sin confirmar en un período ya pagado. Confírmela o descártela antes de procesar.',
      );
    }
  }

  /** Número del período: reutiliza el de un período anulado con la misma fecha; si no, el siguiente. */
  private async siguienteNumero(frecuenciaPagoId: number, anio: number, fechaInicio: string) {
    const anulado = await this.periodos.findOne({
      where: { frecuenciaPagoId, anio, fechaInicio, estado: EstadoPeriodo.ANULADO },
      order: { id: 'DESC' },
    });
    if (anulado) {
      const ocupado = await this.periodos.exists({
        where: { frecuenciaPagoId, anio, numeroPeriodo: anulado.numeroPeriodo, estado: Not(EstadoPeriodo.ANULADO) },
      });
      if (!ocupado) return anulado.numeroPeriodo;
    }
    const { max } = (await this.periodos
      .createQueryBuilder('p')
      .select('COALESCE(MAX(p.numeroPeriodo), 0)', 'max')
      .where('p.frecuenciaPagoId = :f AND p.anio = :anio AND p.estado <> :anulado', {
        f: frecuenciaPagoId,
        anio,
        anulado: EstadoPeriodo.ANULADO,
      })
      .getRawOne<{ max: number }>()) ?? { max: 0 };
    return Number(max) + 1;
  }

  private async conceptosSistema(manager: EntityManager): Promise<ConceptosSistema> {
    const lista = await manager.find(ConceptoNomina, { where: { codigo: In(Object.values(ConceptoSistema)) } });
    const porCodigo = Object.fromEntries(lista.map((c) => [c.codigo, c])) as ConceptosSistema;
    for (const codigo of Object.values(ConceptoSistema)) {
      if (!porCodigo[codigo]) throw new Error(`Falta el concepto del sistema ${codigo}. Ejecute el seed.`);
    }
    return porCodigo;
  }

  private async getFrecuencia(id: number) {
    const frecuencia = await this.frecuencias.findOneBy({ id });
    if (!frecuencia) throw new BadRequestException(`La frecuencia de pago ${id} no existe`);
    return frecuencia;
  }

  private validarFechas(inicio: string, fin: string, pago: string) {
    if (fin < inicio) throw new BadRequestException('La fecha fin no puede ser anterior a la fecha de inicio');
    if (pago < inicio) throw new BadRequestException('La fecha de pago no puede ser anterior al inicio del período');
  }

  /** Dos períodos de la misma frecuencia no pueden cruzarse en fechas (los anulados no cuentan). */
  private async assertSinTraslape(frecuenciaPagoId: number, inicio: string, fin: string, exceptoId?: number) {
    const qb = this.periodos
      .createQueryBuilder('p')
      .where('p.frecuenciaPagoId = :frecuenciaPagoId', { frecuenciaPagoId })
      .andWhere('p.estado <> :anulado', { anulado: EstadoPeriodo.ANULADO })
      .andWhere('p.fechaInicio <= :fin AND p.fechaFin >= :inicio', { inicio, fin });
    if (exceptoId) qb.andWhere('p.id <> :exceptoId', { exceptoId });
    const traslape = await qb.getOne();
    if (traslape) {
      throw new ConflictException(
        `Las fechas se cruzan con el período #${traslape.numeroPeriodo}/${traslape.anio} ` +
          `(${traslape.fechaInicio} a ${traslape.fechaFin})`,
      );
    }
  }
}
