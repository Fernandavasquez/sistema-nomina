import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { type Alcance, AlcanceEmpresas } from '../common/decorators/alcance.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { RolNombre } from '../common/enums.js';
import { CreateEmpresaDto, UpdateEmpresaDto } from './dto/empresa.dto.js';
import { EmpresasService } from './empresas.service.js';

@ApiTags('Empresas')
@ApiBearerAuth()
@Controller('empresas')
export class EmpresasController {
  constructor(private readonly service: EmpresasService) {}

  @ApiOperation({ summary: 'Empresas que el usuario puede ver (para el selector del menú)' })
  @Get()
  findAll(@AlcanceEmpresas() alcance: Alcance) {
    return this.service.findAll(alcance);
  }

  @Roles(RolNombre.ADMIN)
  @Post()
  create(@Body() dto: CreateEmpresaDto) {
    return this.service.create(dto);
  }

  @Roles(RolNombre.ADMIN)
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateEmpresaDto) {
    return this.service.update(id, dto);
  }

  @Roles(RolNombre.ADMIN)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
