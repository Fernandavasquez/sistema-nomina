import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdelantosService } from './adelantos.service.js';
import { CreateAdelantoDto, FiltroAdelantosDto, UpdateAdelantoDto } from './dto/adelanto.dto.js';

@ApiTags('Adelantos')
@ApiBearerAuth()
@Controller('adelantos')
export class AdelantosController {
  constructor(private readonly service: AdelantosService) {}

  @Get()
  findAll(@Query() filtro: FiltroAdelantosDto) {
    return this.service.findAll(filtro);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateAdelantoDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateAdelantoDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
