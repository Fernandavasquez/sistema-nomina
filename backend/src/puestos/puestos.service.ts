import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Alcance } from '../common/decorators/alcance.decorator.js';
import { EstadoEmpleado } from '../common/enums.js';
import { Empleado } from '../empleados/entities/empleado.entity.js';
import { CreatePuestoDto, UpdatePuestoDto } from './dto/puesto.dto.js';
import { Puesto } from './entities/puesto.entity.js';

@Injectable()
export class PuestosService {
  constructor(
    @InjectRepository(Puesto) private readonly puestos: Repository<Puesto>,
    @InjectRepository(Empleado) private readonly empleados: Repository<Empleado>,
  ) {}

  /** Lista de puestos (compartidos entre empresas) con cuántos empleados tiene cada uno en las empresas visibles. */
  async findAll(alcance: Alcance) {
    const [puestos, conteos] = await Promise.all([
      this.puestos.find({ order: { nombre: 'ASC' } }),
      this.empleados
        .createQueryBuilder('e')
        .select('e.puestoId', 'puestoId')
        .addSelect('COUNT(*)::int', 'total')
        .addSelect(`COUNT(*) FILTER (WHERE e.estado = '${EstadoEmpleado.ACTIVO}')::int`, 'activos')
        .where('e.empresaId IN (:...empresas)', { empresas: alcance.ids })
        .groupBy('e.puestoId')
        .getRawMany<{ puestoId: number; total: number; activos: number }>(),
    ]);
    return puestos.map((p) => {
      const c = conteos.find((x) => x.puestoId === p.id);
      return { ...p, empleadosActivos: c?.activos ?? 0, empleadosTotal: c?.total ?? 0 };
    });
  }

  async findOne(id: number) {
    const puesto = await this.puestos.findOneBy({ id });
    if (!puesto) throw new NotFoundException(`Puesto ${id} no encontrado`);
    return puesto;
  }

  async create(dto: CreatePuestoDto) {
    await this.assertNombreUnico(dto.nombre);
    return this.puestos.save(this.puestos.create(dto));
  }

  async update(id: number, dto: UpdatePuestoDto) {
    const puesto = await this.findOne(id);
    if (dto.nombre) await this.assertNombreUnico(dto.nombre, id);
    return this.puestos.save(Object.assign(puesto, dto));
  }

  async remove(id: number) {
    const puesto = await this.findOne(id);
    if (await this.empleados.existsBy({ puestoId: id })) {
      throw new ConflictException('Hay empleados con este puesto. Desactívelo en lugar de eliminarlo.');
    }
    await this.puestos.remove(puesto);
    return { message: 'Puesto eliminado' };
  }

  /** "Piloto" y "piloto " se consideran el mismo puesto. */
  private async assertNombreUnico(nombre: string, exceptoId?: number) {
    const existente = await this.puestos
      .createQueryBuilder('p')
      .where('LOWER(TRIM(p.nombre)) = LOWER(TRIM(:nombre))', { nombre })
      .getOne();
    if (existente && existente.id !== exceptoId) {
      throw new ConflictException(`Ya existe el puesto "${existente.nombre}"`);
    }
  }
}
