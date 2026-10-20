import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CancelarPrestamoDto, CreatePrestamoDto, FiltroPrestamosDto, UpdatePrestamoDto } from './dto/prestamo.dto.js';
import { type Alcance, AlcanceEmpresas } from '../common/decorators/alcance.decorator.js';
import { PrestamosService } from './prestamos.service.js';

@ApiTags('Préstamos')
@ApiBearerAuth()
@Controller('prestamos')
export class PrestamosController {
  constructor(private readonly service: PrestamosService) {}

  @Get()
  findAll(@Query() filtro: FiltroPrestamosDto, @AlcanceEmpresas() alcance: Alcance) {
    return this.service.findAll(filtro, alcance);
  }

  @Get(':id')
  detalle(@Param('id', ParseIntPipe) id: number, @AlcanceEmpresas() alcance: Alcance) {
    return this.service.detalle(id, alcance);
  }

  @Post()
  create(@Body() dto: CreatePrestamoDto, @AlcanceEmpresas() alcance: Alcance) {
    return this.service.create(dto, alcance);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePrestamoDto, @AlcanceEmpresas() alcance: Alcance) {
    return this.service.update(id, dto, alcance);
  }

  @Patch(':id/cancelar')
  cancelar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CancelarPrestamoDto,
    @AlcanceEmpresas() alcance: Alcance,
  ) {
    return this.service.cancelar(id, dto, alcance);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @AlcanceEmpresas() alcance: Alcance) {
    return this.service.remove(id, alcance);
  }
}
