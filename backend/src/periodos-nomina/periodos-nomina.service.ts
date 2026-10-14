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
} from '../common/enums.js';
import { addDays, today, toDate } from '../common/utils/dates.js';
import { round2 } from '../common/utils/money.js';
import { ConceptoNomina } from '../conceptos-nomina/entities/concepto-nomina.entity.js';
import { Empleado } from '../empleados/entities/empleado.entity.js';
import { TipoFrecuenciaPago } from '../frecuencias-pago/entities/tipo-frecuencia-pago.entity.js';
import { NominaDetalle } from '../nominas/entities/nomina-detalle.entity.js';
import { NominaEncabezado } from '../nominas/entities/nomina-encabezado.entity.js';
import { calcularTotales } from '../nominas/nomina-calculo.js';
import { Prestamo } from '../prestamos/entities/prestamo.entity.js';
import { CreatePeriodoNominaDto, FiltroPeriodosDto, UpdatePeriodoNominaDto } from './dto/periodo-nomina.dto.js';
import { PeriodoNomina } from './entities/periodo-nomina.entity.js';
import { ajustarInicioQuincena, calcularFechaFin } from './periodo-fechas.js';

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
    const periodo = await this.periodos.findOne({ where: { id } });
    if (!periodo) throw new NotFoundException(`Período ${id} no encontrado`);
    return periodo;
  }

  /** Período + nóminas de sus empleados + totales generales. */
  async detalle(id: number) {
    const periodo = await this.findOne(id);
    const nominas = await this.nominas.find({
      where: { periodoId: id },
      relations: { empleado: true },
      order: { empleado: { apellidos: 'ASC', nombres: 'ASC' } },
    });
    return {
      ...periodo,
      resumen: {
        empleados: nominas.length,
        totalPercepciones: round2(nominas.reduce((s, n) => s + n.totalPercepciones, 0)),
        totalDeducciones: round2(nominas.reduce((s, n) => s + n.totalDeducciones, 0)),
        totalLiquido: round2(nominas.reduce((s, n) => s + n.liquidoRecibir, 0)),
        nominasConLiquidoNegativo: nominas.filter((n) => n.liquidoRecibir < 0).length,
      },
      nominas,
    };
  }

  /** Propone las fechas del siguiente período (continúa después del último registrado). */
  async sugerencia(frecuenciaPagoId: number) {
    const frecuencia = await this.getFrecuencia(frecuenciaPagoId);
    const ultimo = await this.periodos.findOne({
      where: { frecuenciaPagoId },
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
    const { max } = (await this.periodos
      .createQueryBuilder('p')
      .select('COALESCE(MAX(p.numeroPeriodo), 0)', 'max')
      .where('p.frecuenciaPagoId = :f AND p.anio = :anio', { f: dto.frecuenciaPagoId, anio })
      .getRawOne<{ max: number }>()) ?? { max: 0 };

    const periodo = this.periodos.create({
      frecuenciaPagoId: dto.frecuenciaPagoId,
      anio,
      numeroPeriodo: Number(max) + 1,
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
    if (periodo.estado === EstadoPeriodo.CERRADO)
      throw new ConflictException('Un período cerrado no se puede modificar');
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
      if (periodo.estado === EstadoPeriodo.CERRADO) throw new ConflictException('El período ya está cerrado');

      const otroEnProceso = await manager.exists(PeriodoNomina, {
        where: { frecuenciaPagoId: periodo.frecuenciaPagoId, estado: EstadoPeriodo.PROCESADO, id: Not(id) },
      });
      if (otroEnProceso) {
        throw new ConflictException(
          'Hay otro período de esta frecuencia en estado PROCESADO. Ciérrelo o reviértalo antes de procesar este.',
        );
      }

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

      const [adelantos, prestamos, existentes] = await Promise.all([
        manager.find(Adelanto, {
          where: { empleadoId: In(empleadoIds), aplicado: false, fechaSolicitud: LessThanOrEqual(periodo.fechaFin) },
          order: { fechaSolicitud: 'ASC' },
        }),
        manager.find(Prestamo, {
          where: {
            empleadoId: In(empleadoIds),
            estado: EstadoPrestamo.ACTIVO,
            saldoPendiente: MoreThan(0),
            fechaSolicitud: LessThanOrEqual(periodo.fechaFin),
          },
          order: { fechaSolicitud: 'ASC' },
        }),
        manager.find(NominaEncabezado, { where: { periodoId: id } }),
      ]);

      // Empleados que ya no aplican (inactivados o cambiados de frecuencia): se elimina su nómina.
      const sobrantes = existentes.filter((n) => !empleadoIds.includes(n.empleadoId));
      if (sobrantes.length) await manager.delete(NominaEncabezado, { id: In(sobrantes.map((n) => n.id)) });

      const idsConceptosSistema = Object.values(conceptos).map((c) => c.id);

      for (const empleado of empleados) {
        let nomina = existentes.find((n) => n.empleadoId === empleado.id);
        if (nomina) {
          await manager.delete(NominaDetalle, { nominaId: nomina.id, conceptoId: In(idsConceptosSistema) });
        } else {
          nomina = await manager.save(
            manager.create(NominaEncabezado, {
              periodoId: id,
              empleadoId: empleado.id,
              fechaEmision: today(),
              estado: EstadoNomina.GENERADA,
            }),
          );
        }

        const lineas: Partial<NominaDetalle>[] = [
          { conceptoId: conceptos.SUELDO_BASE.id, monto: empleado.salarioBase },
          ...adelantos
            .filter((a) => a.empleadoId === empleado.id)
            .map((a) => ({
              conceptoId: conceptos.ADELANTO.id,
              monto: a.monto,
              adelantoId: a.id,
              observacion: `Adelanto del ${a.fechaSolicitud}`,
            })),
          ...prestamos
            .filter((p) => p.empleadoId === empleado.id)
            .map((p) => ({
              conceptoId: conceptos.PRESTAMO.id,
              monto: round2(Math.min(p.montoCuota, p.saldoPendiente)),
              prestamoId: p.id,
              observacion: `Cuota préstamo #${p.id} (saldo antes del pago: Q${p.saldoPendiente})`,
            })),
        ];
        await manager.save(lineas.map((l) => manager.create(NominaDetalle, { ...l, nominaId: nomina.id })));
        await this.recalcular(manager, nomina.id);
      }

      await manager.update(PeriodoNomina, id, { estado: EstadoPeriodo.PROCESADO });
    });
    return this.detalle(id);
  }

  /**
   * CERRAR: confirma el pago. Marca los adelantos como aplicados, rebaja el saldo de los
   * préstamos (y los marca PAGADO al llegar a 0) y bloquea el período para siempre.
   */
  async cerrar(id: number) {
    await this.dataSource.transaction(async (manager) => {
      const periodo = await this.bloquearPeriodo(manager, id);
      if (periodo.estado !== EstadoPeriodo.PROCESADO) {
        throw new ConflictException('Solo se puede cerrar un período PROCESADO');
      }

      const nominas = await manager.find(NominaEncabezado, { where: { periodoId: id }, relations: { detalles: true } });
      const negativas = nominas.filter((n) => n.liquidoRecibir < 0).length;
      if (negativas) {
        throw new BadRequestException(
          `Hay ${negativas} nómina(s) con líquido negativo. Ajuste los descuentos antes de cerrar el período.`,
        );
      }

      const detalles = nominas.flatMap((n) => n.detalles);
      const adelantoIds = detalles.filter((d) => d.adelantoId).map((d) => d.adelantoId!);
      if (adelantoIds.length) await manager.update(Adelanto, { id: In(adelantoIds) }, { aplicado: true });

      const abonos = detalles.filter((d) => d.prestamoId);
      if (abonos.length) {
        const prestamos = await manager.find(Prestamo, {
          where: { id: In(abonos.map((d) => d.prestamoId!)) },
          lock: { mode: 'pessimistic_write' },
        });
        for (const prestamo of prestamos) {
          const abonado = abonos.filter((d) => d.prestamoId === prestamo.id).reduce((s, d) => s + d.monto, 0);
          const saldo = Math.max(round2(prestamo.saldoPendiente - abonado), 0);
          await manager.update(Prestamo, prestamo.id, {
            saldoPendiente: saldo,
            estado: saldo === 0 ? EstadoPrestamo.PAGADO : prestamo.estado,
          });
        }
      }

      await manager.update(NominaEncabezado, { periodoId: id }, { estado: EstadoNomina.PAGADA });
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

  // ───────────────────────────── Auxiliares ─────────────────────────────

  /** Recalcula los totales del encabezado a partir de sus líneas de detalle. */
  async recalcular(manager: EntityManager, nominaId: number) {
    const lineas = await manager.find(NominaDetalle, { where: { nominaId } });
    await manager.update(NominaEncabezado, nominaId, calcularTotales(lineas));
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

  private async conceptosSistema(manager: EntityManager) {
    const lista = await manager.find(ConceptoNomina, { where: { codigo: In(Object.values(ConceptoSistema)) } });
    const porCodigo = Object.fromEntries(lista.map((c) => [c.codigo, c])) as Record<ConceptoSistema, ConceptoNomina>;
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

  private async assertSinTraslape(frecuenciaPagoId: number, inicio: string, fin: string, exceptoId?: number) {
    const qb = this.periodos
      .createQueryBuilder('p')
      .where('p.frecuenciaPagoId = :frecuenciaPagoId', { frecuenciaPagoId })
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
