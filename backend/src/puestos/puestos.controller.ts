import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { type Alcance, AlcanceEmpresas } from '../common/decorators/alcance.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { RolNombre } from '../common/enums.js';
import { CreatePuestoDto, UpdatePuestoDto } from './dto/puesto.dto.js';
import { PuestosService } from './puestos.service.js';

@ApiTags('Puestos')
@ApiBearerAuth()
@Controller('puestos')
export class PuestosController {
  constructor(private readonly service: PuestosService) {}

  @ApiOperation({ summary: 'Lista de puestos con la cantidad de empleados de cada uno' })
  @Get()
  findAll(@AlcanceEmpresas() alcance: Alcance) {
    return this.service.findAll(alcance);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Roles(RolNombre.ADMIN)
  @Post()
  create(@Body() dto: CreatePuestoDto) {
    return this.service.create(dto);
  }

  @Roles(RolNombre.ADMIN)
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePuestoDto) {
    return this.service.update(id, dto);
  }

  @Roles(RolNombre.ADMIN)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
