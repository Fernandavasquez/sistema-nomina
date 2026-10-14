import { Body, ConflictException, Controller, Delete, Get, NotFoundException, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Roles } from '../common/decorators/roles.decorator.js';
import { RolNombre } from '../common/enums.js';
import { Empleado } from '../empleados/entities/empleado.entity.js';
import { CreatePuestoDto, UpdatePuestoDto } from './dto/puesto.dto.js';
import { Puesto } from './entities/puesto.entity.js';

/** Catálogo sencillo: la lógica cabe en el controlador sin necesidad de un service aparte. */
@ApiTags('Puestos')
@ApiBearerAuth()
@Controller('puestos')
export class PuestosController {
  constructor(
    @InjectRepository(Puesto) private readonly puestos: Repository<Puesto>,
    @InjectRepository(Empleado) private readonly empleados: Repository<Empleado>,
  ) {}

  @Get()
  findAll() {
    return this.puestos.find({ order: { nombre: 'ASC' } });
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const puesto = await this.puestos.findOneBy({ id });
    if (!puesto) throw new NotFoundException(`Puesto ${id} no encontrado`);
    return puesto;
  }

  @Roles(RolNombre.ADMIN)
  @Post()
  create(@Body() dto: CreatePuestoDto) {
    return this.puestos.save(this.puestos.create(dto));
  }

  @Roles(RolNombre.ADMIN)
  @Patch(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePuestoDto) {
    const puesto = await this.findOne(id);
    return this.puestos.save(Object.assign(puesto, dto));
  }

  @Roles(RolNombre.ADMIN)
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    const puesto = await this.findOne(id);
    if (await this.empleados.existsBy({ puestoId: id })) {
      throw new ConflictException('Hay empleados con este puesto. Desactívelo en lugar de eliminarlo.');
    }
    await this.puestos.remove(puesto);
    return { message: 'Puesto eliminado' };
  }
}
