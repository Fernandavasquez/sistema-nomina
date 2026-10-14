import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AgregarDetalleDto, FiltroNominasDto } from './dto/nomina.dto.js';
import { NominasService } from './nominas.service.js';

@ApiTags('Nóminas')
@ApiBearerAuth()
@Controller('nominas')
export class NominasController {
  constructor(private readonly service: NominasService) {}

  @Get()
  findAll(@Query() filtro: FiltroNominasDto) {
    return this.service.findAll(filtro);
  }

  @ApiOperation({ summary: 'Boleta de pago con su detalle' })
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @ApiOperation({ summary: 'Agrega un bono o descuento manual' })
  @Post(':id/detalles')
  agregarDetalle(@Param('id', ParseIntPipe) id: number, @Body() dto: AgregarDetalleDto) {
    return this.service.agregarDetalle(id, dto);
  }

  @Delete(':id/detalles/:detalleId')
  eliminarDetalle(@Param('id', ParseIntPipe) id: number, @Param('detalleId', ParseIntPipe) detalleId: number) {
    return this.service.eliminarDetalle(id, detalleId);
  }
}
