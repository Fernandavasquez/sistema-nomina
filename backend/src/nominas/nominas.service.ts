import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, FindOptionsWhere, Repository } from 'typeorm';
import { EstadoNomina, EstadoPeriodo } from '../common/enums.js';
import { ConceptoNomina } from '../conceptos-nomina/entities/concepto-nomina.entity.js';
import { PeriodosNominaService } from '../periodos-nomina/periodos-nomina.service.js';
import { AgregarDetalleDto, FiltroNominasDto } from './dto/nomina.dto.js';
import { NominaDetalle } from './entities/nomina-detalle.entity.js';
import { NominaEncabezado } from './entities/nomina-encabezado.entity.js';

@Injectable()
export class NominasService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(NominaEncabezado) private readonly nominas: Repository<NominaEncabezado>,
    @InjectRepository(ConceptoNomina) private readonly conceptos: Repository<ConceptoNomina>,
    private readonly periodos: PeriodosNominaService,
  ) {}

  findAll(filtro: FiltroNominasDto) {
    const where: FindOptionsWhere<NominaEncabezado> = {};
    if (filtro.periodoId) where.periodoId = filtro.periodoId;
    if (filtro.empleadoId) where.empleadoId = filtro.empleadoId;
    return this.nominas.find({
      where,
      relations: { empleado: true, periodo: true },
      order: { periodo: { fechaInicio: 'DESC' }, empleado: { apellidos: 'ASC' } },
    });
  }

  /** Boleta completa: encabezado, empleado, período y cada línea con su concepto. */
  async findOne(id: number) {
    const nomina = await this.nominas.findOne({
      where: { id },
      relations: { empleado: true, periodo: true, detalles: true },
    });
    if (!nomina) throw new NotFoundException(`Nómina ${id} no encontrada`);
    // Percepciones primero, luego deducciones.
    nomina.detalles.sort((a, b) => a.concepto.tipo.localeCompare(b.concepto.tipo) * -1 || a.id - b.id);
    return nomina;
  }

  async agregarDetalle(id: number, dto: AgregarDetalleDto) {
    const nomina = await this.assertEditable(id);
    const concepto = await this.conceptos.findOneBy({ id: dto.conceptoId });
    if (!concepto || !concepto.activo) throw new BadRequestException('Concepto inexistente o inactivo');
    if (concepto.esSistema) {
      throw new BadRequestException(
        'Los conceptos del sistema (sueldo, adelantos, préstamos) se calculan solos al procesar el período',
      );
    }

    await this.dataSource.transaction(async (manager) => {
      await manager.save(manager.create(NominaDetalle, { ...dto, nominaId: nomina.id }));
      await this.periodos.recalcular(manager, nomina.id);
    });
    return this.findOne(id);
  }

  async eliminarDetalle(id: number, detalleId: number) {
    const nomina = await this.assertEditable(id);
    const detalle = nomina.detalles.find((d) => d.id === detalleId);
    if (!detalle) throw new NotFoundException(`La línea ${detalleId} no pertenece a la nómina ${id}`);
    if (detalle.concepto.esSistema) {
      throw new BadRequestException('Las líneas automáticas no se eliminan; corrija el dato de origen y reprocese');
    }

    await this.dataSource.transaction(async (manager) => {
      await manager.delete(NominaDetalle, detalleId);
      await this.periodos.recalcular(manager, nomina.id);
    });
    return this.findOne(id);
  }

  private async assertEditable(id: number) {
    const nomina = await this.findOne(id);
    if (nomina.estado !== EstadoNomina.GENERADA || nomina.periodo.estado !== EstadoPeriodo.PROCESADO) {
      throw new ConflictException('Solo se pueden modificar nóminas de un período PROCESADO (no cerrado)');
    }
    return nomina;
  }
}
