import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { type Alcance, AlcanceEmpresas } from '../common/decorators/alcance.decorator.js';
import { CreateViaticoDto, FiltroViaticosDto, UpdateViaticoDto } from './dto/viatico.dto.js';
import { ViaticosService } from './viaticos.service.js';

@ApiTags('Viáticos')
@ApiBearerAuth()
@Controller('viaticos')
export class ViaticosController {
  constructor(private readonly service: ViaticosService) {}

  @ApiOperation({ summary: 'Viáticos entregados (con su estado: PROGRAMADO, EN_VIAJE o FINALIZADO)' })
  @Get()
  findAll(@Query() filtro: FiltroViaticosDto, @AlcanceEmpresas() alcance: Alcance) {
    return this.service.findAll(filtro, alcance);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @AlcanceEmpresas() alcance: Alcance) {
    return this.service.findOne(id, alcance);
  }

  @ApiOperation({ summary: 'Registra un viático (solo empleados cuyo puesto recibe viáticos)' })
  @Post()
  create(@Body() dto: CreateViaticoDto, @AlcanceEmpresas() alcance: Alcance) {
    return this.service.create(dto, alcance);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateViaticoDto, @AlcanceEmpresas() alcance: Alcance) {
    return this.service.update(id, dto, alcance);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @AlcanceEmpresas() alcance: Alcance) {
    return this.service.remove(id, alcance);
  }
}
