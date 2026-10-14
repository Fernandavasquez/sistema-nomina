import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Roles } from '../common/decorators/roles.decorator.js';
import { RolNombre } from '../common/enums.js';
import { NominaDetalle } from '../nominas/entities/nomina-detalle.entity.js';
import { CreateConceptoNominaDto, UpdateConceptoNominaDto } from './dto/concepto-nomina.dto.js';
import { ConceptoNomina } from './entities/concepto-nomina.entity.js';

@ApiTags('Conceptos de nómina')
@ApiBearerAuth()
@Controller('conceptos-nomina')
export class ConceptosNominaController {
  constructor(
    @InjectRepository(ConceptoNomina) private readonly conceptos: Repository<ConceptoNomina>,
    @InjectRepository(NominaDetalle) private readonly detalles: Repository<NominaDetalle>,
  ) {}

  @Get()
  findAll() {
    return this.conceptos.find({ order: { tipo: 'DESC', nombre: 'ASC' } });
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const concepto = await this.conceptos.findOneBy({ id });
    if (!concepto) throw new NotFoundException(`Concepto ${id} no encontrado`);
    return concepto;
  }

  @Roles(RolNombre.ADMIN)
  @Post()
  create(@Body() dto: CreateConceptoNominaDto) {
    return this.conceptos.save(this.conceptos.create({ ...dto, esSistema: false }));
  }

  @Roles(RolNombre.ADMIN)
  @Patch(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateConceptoNominaDto) {
    const concepto = await this.assertEditable(id);
    return this.conceptos.save(Object.assign(concepto, dto));
  }

  @Roles(RolNombre.ADMIN)
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    const concepto = await this.assertEditable(id);
    if (await this.detalles.existsBy({ conceptoId: id })) {
      throw new ConflictException('El concepto ya se usó en nóminas. Desactívelo en lugar de eliminarlo.');
    }
    await this.conceptos.remove(concepto);
    return { message: 'Concepto eliminado' };
  }

  private async assertEditable(id: number) {
    const concepto = await this.findOne(id);
    if (concepto.esSistema) {
      throw new BadRequestException('Los conceptos del sistema no se pueden modificar ni eliminar');
    }
    return concepto;
  }
}
