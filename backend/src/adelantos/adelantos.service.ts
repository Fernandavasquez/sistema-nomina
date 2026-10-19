import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Not, Repository } from 'typeorm';
import { EstadoEmpleado, EstadoNomina } from '../common/enums.js';
import { today } from '../common/utils/dates.js';
import { round2 } from '../common/utils/money.js';
import { Empleado } from '../empleados/entities/empleado.entity.js';
import { NominaDetalle } from '../nominas/entities/nomina-detalle.entity.js';
import { CreateAdelantoDto, FiltroAdelantosDto, UpdateAdelantoDto } from './dto/adelanto.dto.js';
import { Adelanto } from './entities/adelanto.entity.js';

@Injectable()
export class AdelantosService {
  constructor(
    @InjectRepository(Adelanto) private readonly adelantos: Repository<Adelanto>,
    @InjectRepository(Empleado) private readonly empleados: Repository<Empleado>,
    @InjectRepository(NominaDetalle) private readonly detalles: Repository<NominaDetalle>,
  ) {}

  findAll(filtro: FiltroAdelantosDto) {
    const where: FindOptionsWhere<Adelanto> = {};
    if (filtro.empleadoId) where.empleadoId = filtro.empleadoId;
    if (filtro.aplicado !== undefined) where.aplicado = filtro.aplicado;
    return this.adelantos.find({
      where,
      relations: { empleado: true },
      order: { fechaSolicitud: 'DESC', id: 'DESC' },
    });
  }

  async findOne(id: number) {
    const adelanto = await this.adelantos.findOne({ where: { id }, relations: { empleado: true } });
    if (!adelanto) throw new NotFoundException(`Adelanto ${id} no encontrado`);
    return adelanto;
  }

  async create(dto: CreateAdelantoDto) {
    const empleado = await this.empleados.findOneBy({ id: dto.empleadoId });
    if (!empleado) throw new BadRequestException(`El empleado ${dto.empleadoId} no existe`);
    if (empleado.estado !== EstadoEmpleado.ACTIVO) {
      throw new BadRequestException('No se pueden dar adelantos a un empleado inactivo');
    }
    await this.validarTope(empleado, dto.monto);

    const { id } = await this.adelantos.save(
      this.adelantos.create({ ...dto, fechaSolicitud: dto.fechaSolicitud ?? today() }),
    );
    return this.findOne(id);
  }

  async update(id: number, dto: UpdateAdelantoDto) {
    const adelanto = await this.assertEditable(id);
    if (dto.monto !== undefined) await this.validarTope(adelanto.empleado, dto.monto, id);
    if (Object.keys(dto).length) await this.adelantos.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: number) {
    const adelanto = await this.assertEditable(id);
    if (await this.detalles.existsBy({ adelantoId: id })) {
      throw new ConflictException(
        'El adelanto aparece en una boleta anulada (historial) y no se puede eliminar; puede editarlo.',
      );
    }
    await this.adelantos.remove(adelanto);
    return { message: 'Adelanto eliminado' };
  }

  /**
   * El adelanto se descuenta completo en el siguiente pago, así que la suma
   * de adelantos pendientes no puede superar el salario de un período.
   */
  private async validarTope(empleado: Empleado, monto: number, exceptoId?: number) {
    const pendientes = await this.adelantos.findBy({ empleadoId: empleado.id, aplicado: false });
    const otros = pendientes.filter((a) => a.id !== exceptoId).reduce((s, a) => s + a.monto, 0);
    const disponible = round2(empleado.salarioBase - otros);
    if (monto > disponible) {
      throw new BadRequestException(
        `El adelanto supera lo disponible del próximo pago. Salario: Q${empleado.salarioBase}, ` +
          `adelantos pendientes: Q${round2(otros)}, máximo permitido: Q${Math.max(disponible, 0)}`,
      );
    }
  }

  private async assertEditable(id: number) {
    const adelanto = await this.findOne(id);
    if (adelanto.aplicado) {
      throw new ConflictException('El adelanto ya fue descontado en una nómina cerrada y no se puede modificar');
    }
    const enBoletaVigente = await this.detalles.exists({
      where: { adelantoId: id, nomina: { estado: Not(EstadoNomina.ANULADA) } },
    });
    if (enBoletaVigente) {
      throw new ConflictException(
        'El adelanto está incluido en una nómina en proceso. Revierta el procesamiento del período para modificarlo.',
      );
    }
    return adelanto;
  }
}
