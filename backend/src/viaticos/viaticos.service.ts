import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { type Alcance, assertAccesoEmpresa } from '../common/decorators/alcance.decorator.js';
import { EstadoEmpleado } from '../common/enums.js';
import { today } from '../common/utils/dates.js';
import { Empleado } from '../empleados/entities/empleado.entity.js';
import { CreateViaticoDto, FiltroViaticosDto, UpdateViaticoDto } from './dto/viatico.dto.js';
import { Viatico } from './entities/viatico.entity.js';

export type EstadoViatico = 'PROGRAMADO' | 'EN_VIAJE' | 'FINALIZADO';

/** Según las fechas: aún no sale, está de viaje, o el viaje ya terminó. */
export function estadoViatico(v: Pick<Viatico, 'fechaEntrega' | 'fechaHasta'>, hoy = today()): EstadoViatico {
  if (hoy < v.fechaEntrega) return 'PROGRAMADO';
  if (hoy <= v.fechaHasta) return 'EN_VIAJE';
  return 'FINALIZADO';
}

@Injectable()
export class ViaticosService {
  constructor(
    @InjectRepository(Viatico) private readonly viaticos: Repository<Viatico>,
    @InjectRepository(Empleado) private readonly empleados: Repository<Empleado>,
  ) {}

  async findAll(filtro: FiltroViaticosDto, alcance: Alcance) {
    const qb = this.viaticos
      .createQueryBuilder('v')
      .innerJoinAndSelect('v.empleado', 'e')
      .leftJoinAndSelect('e.empresa', 'empresa')
      .leftJoinAndSelect('e.puesto', 'puesto')
      .where('e.empresaId IN (:...empresas)', { empresas: alcance.ids })
      .orderBy('v.fechaEntrega', 'DESC')
      .addOrderBy('v.id', 'DESC');
    if (filtro.empleadoId) qb.andWhere('v.empleadoId = :empleadoId', { empleadoId: filtro.empleadoId });
    if (filtro.desde) qb.andWhere('v.fechaEntrega >= :desde', { desde: filtro.desde });
    if (filtro.hasta) qb.andWhere('v.fechaEntrega <= :hasta', { hasta: filtro.hasta });
    if (filtro.buscar?.trim()) {
      qb.andWhere('(v.destino ILIKE :buscar OR v.asunto ILIKE :buscar)', { buscar: `%${filtro.buscar.trim()}%` });
    }
    const lista = await qb.getMany();
    return lista.map((v) => ({ ...v, estado: estadoViatico(v) }));
  }

  async findOne(id: number, alcance?: Alcance) {
    const viatico = await this.viaticos.findOne({ where: { id }, relations: { empleado: true } });
    if (!viatico) throw new NotFoundException(`Viático ${id} no encontrado`);
    if (alcance) assertAccesoEmpresa(alcance, viatico.empleado.empresaId, `Viático ${id} no encontrado`);
    return { ...viatico, estado: estadoViatico(viatico) };
  }

  async create(dto: CreateViaticoDto, alcance: Alcance) {
    const empleado = await this.empleados.findOneBy({ id: dto.empleadoId });
    if (!empleado || !alcance.permitidas.includes(empleado.empresaId)) {
      throw new BadRequestException(`El empleado ${dto.empleadoId} no existe`);
    }
    if (empleado.estado !== EstadoEmpleado.ACTIVO) {
      throw new BadRequestException('No se pueden dar viáticos a un empleado inactivo');
    }
    if (!empleado.puesto.recibeViaticos) {
      throw new BadRequestException(
        `El puesto ${empleado.puesto.nombre} no recibe viáticos. Márquelo en Puestos si debe recibirlos.`,
      );
    }
    this.validarFechas(dto.fechaEntrega, dto.fechaHasta);
    const { id } = await this.viaticos.save(this.viaticos.create(dto));
    return this.findOne(id);
  }

  async update(id: number, dto: UpdateViaticoDto, alcance: Alcance) {
    const viatico = await this.findOne(id, alcance);
    this.validarFechas(dto.fechaEntrega ?? viatico.fechaEntrega, dto.fechaHasta ?? viatico.fechaHasta);
    if (Object.keys(dto).length) await this.viaticos.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: number, alcance: Alcance) {
    await this.findOne(id, alcance);
    await this.viaticos.delete(id);
    return { message: 'Viático eliminado' };
  }

  private validarFechas(entrega: string, hasta: string) {
    if (hasta < entrega) {
      throw new BadRequestException('La fecha "hasta" no puede ser anterior a la fecha en que se dio el viático');
    }
  }
}
