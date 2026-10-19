import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { EstadoEmpleado, EstadoNomina, EstadoPrestamo } from '../common/enums.js';
import { today } from '../common/utils/dates.js';
import { Empleado } from '../empleados/entities/empleado.entity.js';
import { NominaDetalle } from '../nominas/entities/nomina-detalle.entity.js';
import { salarioPorPago } from '../nominas/salario.js';
import { CancelarPrestamoDto, CreatePrestamoDto, FiltroPrestamosDto, UpdatePrestamoDto } from './dto/prestamo.dto.js';
import { Prestamo } from './entities/prestamo.entity.js';

@Injectable()
export class PrestamosService {
  constructor(
    @InjectRepository(Prestamo) private readonly prestamos: Repository<Prestamo>,
    @InjectRepository(Empleado) private readonly empleados: Repository<Empleado>,
    @InjectRepository(NominaDetalle) private readonly detalles: Repository<NominaDetalle>,
  ) {}

  findAll(filtro: FiltroPrestamosDto) {
    const where: FindOptionsWhere<Prestamo> = {};
    if (filtro.empleadoId) where.empleadoId = filtro.empleadoId;
    if (filtro.estado) where.estado = filtro.estado;
    return this.prestamos.find({
      where,
      relations: { empleado: true },
      order: { fechaSolicitud: 'DESC', id: 'DESC' },
    });
  }

  async findOne(id: number) {
    const prestamo = await this.prestamos.findOne({ where: { id }, relations: { empleado: true } });
    if (!prestamo) throw new NotFoundException(`Préstamo ${id} no encontrado`);
    return prestamo;
  }

  /** Préstamo + historial de cuotas descontadas en nóminas (pagadas o en proceso). */
  async detalle(id: number) {
    const prestamo = await this.findOne(id);
    const abonos = await this.detalles.find({
      where: { prestamoId: id },
      relations: { nomina: { periodo: true } },
      order: { nomina: { periodo: { fechaInicio: 'ASC' } } },
    });
    return {
      ...prestamo,
      abonos: abonos.map((d) => ({
        id: d.id,
        monto: d.monto,
        nominaId: d.nominaId,
        estadoNomina: d.nomina.estado,
        periodo: d.nomina.periodo,
      })),
    };
  }

  async create(dto: CreatePrestamoDto) {
    const empleado = await this.empleados.findOneBy({ id: dto.empleadoId });
    if (!empleado) throw new BadRequestException(`El empleado ${dto.empleadoId} no existe`);
    if (empleado.estado !== EstadoEmpleado.ACTIVO) {
      throw new BadRequestException('No se pueden otorgar préstamos a un empleado inactivo');
    }
    this.validarCuota(dto.montoCuota, dto.montoTotal, salarioPorPago(empleado.salarioMensual, empleado.frecuenciaPago));

    const { id } = await this.prestamos.save(
      this.prestamos.create({
        ...dto,
        saldoPendiente: dto.montoTotal,
        fechaSolicitud: dto.fechaSolicitud ?? today(),
        estado: EstadoPrestamo.ACTIVO,
      }),
    );
    return this.findOne(id);
  }

  async update(id: number, dto: UpdatePrestamoDto) {
    const prestamo = await this.findOne(id);
    if (prestamo.estado !== EstadoPrestamo.ACTIVO) {
      throw new ConflictException('Solo se pueden modificar préstamos activos');
    }
    if (dto.montoCuota !== undefined) {
      await this.assertSinNominaEnProceso(id);
      this.validarCuota(
        dto.montoCuota,
        prestamo.saldoPendiente,
        salarioPorPago(prestamo.empleado.salarioMensual, prestamo.empleado.frecuenciaPago),
      );
    }
    if (Object.keys(dto).length) await this.prestamos.update(id, dto);
    return this.findOne(id);
  }

  async cancelar(id: number, dto: CancelarPrestamoDto) {
    const prestamo = await this.findOne(id);
    if (prestamo.estado !== EstadoPrestamo.ACTIVO) {
      throw new ConflictException('Solo se pueden cancelar préstamos activos');
    }
    await this.assertSinNominaEnProceso(id);
    const nota = `[Cancelado ${today()}] ${dto.motivo}`;
    await this.prestamos.update(id, {
      estado: EstadoPrestamo.CANCELADO,
      observacion: prestamo.observacion ? `${prestamo.observacion}\n${nota}` : nota,
    });
    return this.findOne(id);
  }

  async remove(id: number) {
    const prestamo = await this.findOne(id);
    if (await this.detalles.existsBy({ prestamoId: id })) {
      throw new ConflictException('El préstamo ya tiene cuotas en nóminas. Cancélelo en lugar de eliminarlo.');
    }
    await this.prestamos.remove(prestamo);
    return { message: 'Préstamo eliminado' };
  }

  private validarCuota(cuota: number, tope: number, salario: number) {
    if (cuota > tope) throw new BadRequestException('La cuota no puede ser mayor al monto pendiente del préstamo');
    if (cuota > salario) throw new BadRequestException(`La cuota no puede superar el pago del período (Q${salario})`);
  }

  private async assertSinNominaEnProceso(prestamoId: number) {
    const enProceso = await this.detalles.exists({
      where: { prestamoId, nomina: { estado: EstadoNomina.GENERADA } },
    });
    if (enProceso) {
      throw new ConflictException(
        'El préstamo tiene una cuota en una nómina en proceso. Cierre o revierta ese período primero.',
      );
    }
  }
}
