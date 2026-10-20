import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, FindOptionsWhere, In, Repository } from 'typeorm';
import { type Alcance, assertAccesoEmpresa } from '../common/decorators/alcance.decorator.js';
import type { AuthUser } from '../common/decorators/current-user.decorator.js';
import { EstadoNomina, EstadoPeriodo, MetodoPago, RolNombre } from '../common/enums.js';
import { ConceptoNomina } from '../conceptos-nomina/entities/concepto-nomina.entity.js';
import { PeriodosNominaService } from '../periodos-nomina/periodos-nomina.service.js';
import { AgregarDetalleDto, CambiarMetodoPagoDto, FiltroNominasDto, RegistrarFaltasDto } from './dto/nomina.dto.js';
import { NominaDetalle } from './entities/nomina-detalle.entity.js';
import { NominaEncabezado } from './entities/nomina-encabezado.entity.js';
import { datosPago, tieneCuenta } from './metodo-pago.js';

@Injectable()
export class NominasService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(NominaEncabezado) private readonly nominas: Repository<NominaEncabezado>,
    @InjectRepository(ConceptoNomina) private readonly conceptos: Repository<ConceptoNomina>,
    private readonly periodos: PeriodosNominaService,
  ) {}

  findAll(filtro: FiltroNominasDto, alcance: Alcance) {
    const where: FindOptionsWhere<NominaEncabezado> = { periodo: { empresaId: In(alcance.ids) } };
    if (filtro.periodoId) where.periodoId = filtro.periodoId;
    if (filtro.empleadoId) where.empleadoId = filtro.empleadoId;
    return this.nominas.find({
      where,
      relations: { empleado: true, periodo: true },
      order: { periodo: { fechaInicio: 'DESC' }, empleado: { apellidos: 'ASC' } },
    });
  }

  /** Boleta completa: encabezado, empleado, período y cada línea con su concepto. */
  /** Con `alcance`, una boleta de una empresa a la que el usuario no tiene acceso no se encuentra. */
  async findOne(id: number, alcance?: Alcance) {
    const nomina = await this.nominas.findOne({
      where: { id },
      relations: { empleado: true, periodo: { empresa: true, frecuenciaPago: true }, detalles: true, anuladoPor: true },
    });
    if (!nomina) throw new NotFoundException(`Nómina ${id} no encontrada`);
    if (alcance) assertAccesoEmpresa(alcance, nomina.periodo.empresaId, `Nómina ${id} no encontrada`);
    // Percepciones primero, luego deducciones.
    nomina.detalles.sort((a, b) => a.concepto.tipo.localeCompare(b.concepto.tipo) * -1 || a.id - b.id);
    return nomina;
  }

  async agregarDetalle(id: number, dto: AgregarDetalleDto, alcance: Alcance) {
    const nomina = await this.assertEditable(id, alcance);
    const concepto = await this.conceptos.findOneBy({ id: dto.conceptoId });
    if (!concepto || !concepto.activo) throw new BadRequestException('Concepto inexistente o inactivo');
    if (concepto.esSistema) {
      throw new BadRequestException(
        'Los conceptos del sistema (sueldo, faltas, adelantos, préstamos) se calculan solos al procesar el período',
      );
    }

    await this.dataSource.transaction(async (manager) => {
      await manager.save(manager.create(NominaDetalle, { ...dto, nominaId: nomina.id }));
      await this.periodos.recalcular(manager, nomina.id);
    });
    return this.findOne(id);
  }

  async eliminarDetalle(id: number, detalleId: number, alcance: Alcance) {
    const nomina = await this.assertEditable(id, alcance);
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

  /** Días que faltó: descuenta un salario diario (mensual ÷ días del mes) por cada uno. */
  async registrarFaltas(id: number, { diasFalta }: RegistrarFaltasDto, alcance: Alcance) {
    await this.assertEditable(id, alcance);
    await this.periodos.registrarFaltas(id, diasFalta);
    return this.findOne(id);
  }

  /**
   * Cambia la forma de pago (efectivo o depósito). Antes de confirmar el pago lo puede hacer
   * cualquier usuario; en una boleta ya pagada solo el administrador (para corregir cómo se entregó).
   */
  async cambiarMetodoPago(id: number, { metodoPago }: CambiarMetodoPagoDto, usuario: AuthUser, alcance: Alcance) {
    const nomina = await this.findOne(id, alcance);
    if (nomina.estado === EstadoNomina.ANULADA) {
      throw new ConflictException('La boleta está anulada');
    }
    if (nomina.estado === EstadoNomina.PAGADA && usuario.rol !== RolNombre.ADMIN) {
      throw new ForbiddenException('Solo un administrador puede cambiar la forma de pago de una boleta ya pagada');
    }
    if (metodoPago === MetodoPago.DEPOSITO && !tieneCuenta(nomina.empleado)) {
      throw new BadRequestException(
        'El empleado no tiene banco y número de cuenta registrados. Agréguelos en su ficha para pagarle por depósito.',
      );
    }
    await this.nominas.update(id, datosPago(nomina.empleado, metodoPago));
    return this.findOne(id);
  }

  private async assertEditable(id: number, alcance: Alcance) {
    const nomina = await this.findOne(id, alcance);
    // Editable: boletas en revisión, o boletas nuevas emitidas en un período ya pagado (antes de confirmarlas).
    const periodoEditable = [EstadoPeriodo.PROCESADO, EstadoPeriodo.CERRADO].includes(nomina.periodo.estado);
    if (nomina.estado !== EstadoNomina.GENERADA || !periodoEditable) {
      throw new ConflictException('Solo se pueden modificar boletas en revisión o boletas nuevas sin confirmar');
    }
    return nomina;
  }
}
