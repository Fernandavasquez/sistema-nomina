import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { type Alcance, AlcanceEmpresas } from '../common/decorators/alcance.decorator.js';
import { AdelantosService } from './adelantos.service.js';
import { CreateAdelantoDto, FiltroAdelantosDto, UpdateAdelantoDto } from './dto/adelanto.dto.js';

@ApiTags('Adelantos')
@ApiBearerAuth()
@Controller('adelantos')
export class AdelantosController {
  constructor(private readonly service: AdelantosService) {}

  @Get()
  findAll(@Query() filtro: FiltroAdelantosDto, @AlcanceEmpresas() alcance: Alcance) {
    return this.service.findAll(filtro, alcance);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @AlcanceEmpresas() alcance: Alcance) {
    return this.service.findOne(id, alcance);
  }

  @Post()
  create(@Body() dto: CreateAdelantoDto, @AlcanceEmpresas() alcance: Alcance) {
    return this.service.create(dto, alcance);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateAdelantoDto, @AlcanceEmpresas() alcance: Alcance) {
    return this.service.update(id, dto, alcance);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @AlcanceEmpresas() alcance: Alcance) {
    return this.service.remove(id, alcance);
  }
}
