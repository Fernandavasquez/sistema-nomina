import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import type { Alcance } from '../common/decorators/alcance.decorator.js';
import { EstadoEmpleado } from '../common/enums.js';
import { Empleado } from '../empleados/entities/empleado.entity.js';
import { PeriodoNomina } from '../periodos-nomina/entities/periodo-nomina.entity.js';
import { CreateEmpresaDto, UpdateEmpresaDto } from './dto/empresa.dto.js';
import { Empresa } from './entities/empresa.entity.js';

@Injectable()
export class EmpresasService {
  constructor(
    @InjectRepository(Empresa) private readonly empresas: Repository<Empresa>,
    @InjectRepository(Empleado) private readonly empleados: Repository<Empleado>,
    @InjectRepository(PeriodoNomina) private readonly periodos: Repository<PeriodoNomina>,
  ) {}

  /** Empresas que el usuario puede ver, con cuántos empleados activos tiene cada una. */
  async findAll(alcance: Alcance) {
    const [empresas, conteos] = await Promise.all([
      this.empresas.find({
        where: { id: In(alcance.permitidas.length ? alcance.permitidas : [0]) },
        order: { nombre: 'ASC' },
      }),
      this.empleados
        .createQueryBuilder('e')
        .select('e.empresaId', 'empresaId')
        .addSelect(`COUNT(*) FILTER (WHERE e.estado = '${EstadoEmpleado.ACTIVO}')::int`, 'activos')
        .groupBy('e.empresaId')
        .getRawMany<{ empresaId: number; activos: number }>(),
    ]);
    return empresas.map((e) => ({ ...e, empleadosActivos: conteos.find((c) => c.empresaId === e.id)?.activos ?? 0 }));
  }

  async findOne(id: number) {
    const empresa = await this.empresas.findOneBy({ id });
    if (!empresa) throw new NotFoundException(`Empresa ${id} no encontrada`);
    return empresa;
  }

  async create(dto: CreateEmpresaDto) {
    await this.assertNombreUnico(dto.nombre);
    return this.empresas.save(this.empresas.create(dto));
  }

  async update(id: number, dto: UpdateEmpresaDto) {
    const empresa = await this.findOne(id);
    if (dto.nombre) await this.assertNombreUnico(dto.nombre, id);
    return this.empresas.save(Object.assign(empresa, dto));
  }

  /** Solo se elimina una empresa sin empleados ni períodos; si tiene historial, se desactiva. */
  async remove(id: number) {
    const empresa = await this.findOne(id);
    const [conEmpleados, conPeriodos] = await Promise.all([
      this.empleados.existsBy({ empresaId: id }),
      this.periodos.existsBy({ empresaId: id }),
    ]);
    if (conEmpleados || conPeriodos) {
      throw new ConflictException(
        'La empresa tiene empleados o pagos registrados. Desactívela en lugar de eliminarla.',
      );
    }
    await this.empresas.remove(empresa);
    return { message: 'Empresa eliminada' };
  }

  /** "El Marfil" y "el marfil " se consideran la misma empresa. */
  private async assertNombreUnico(nombre: string, exceptoId?: number) {
    const existente = await this.empresas
      .createQueryBuilder('e')
      .where('LOWER(TRIM(e.nombre)) = LOWER(TRIM(:nombre))', { nombre })
      .getOne();
    if (existente && existente.id !== exceptoId) {
      throw new ConflictException(`Ya existe la empresa "${existente.nombre}"`);
    }
  }
}
