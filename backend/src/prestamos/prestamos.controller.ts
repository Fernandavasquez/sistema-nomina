import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CancelarPrestamoDto, CreatePrestamoDto, FiltroPrestamosDto, UpdatePrestamoDto } from './dto/prestamo.dto.js';
import { PrestamosService } from './prestamos.service.js';

@ApiTags('Préstamos')
@ApiBearerAuth()
@Controller('prestamos')
export class PrestamosController {
  constructor(private readonly service: PrestamosService) {}

  @Get()
  findAll(@Query() filtro: FiltroPrestamosDto) {
    return this.service.findAll(filtro);
  }

  @Get(':id')
  detalle(@Param('id', ParseIntPipe) id: number) {
    return this.service.detalle(id);
  }

  @Post()
  create(@Body() dto: CreatePrestamoDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePrestamoDto) {
    return this.service.update(id, dto);
  }

  @Patch(':id/cancelar')
  cancelar(@Param('id', ParseIntPipe) id: number, @Body() dto: CancelarPrestamoDto) {
    return this.service.cancelar(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
