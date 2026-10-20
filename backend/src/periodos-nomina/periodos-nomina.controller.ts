import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { type Alcance, AlcanceEmpresas } from '../common/decorators/alcance.decorator.js';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { RolNombre } from '../common/enums.js';
import {
  CreatePeriodoNominaDto,
  FiltroPeriodosDto,
  SugerenciaPeriodoDto,
  UpdatePeriodoNominaDto,
} from './dto/periodo-nomina.dto.js';
import { AnularDto } from './dto/anular.dto.js';
import { PeriodosNominaService } from './periodos-nomina.service.js';

@ApiTags('Períodos de nómina')
@ApiBearerAuth()
@Controller('periodos-nomina')
export class PeriodosNominaController {
  constructor(private readonly service: PeriodosNominaService) {}

  @Get()
  findAll(@Query() filtro: FiltroPeriodosDto, @AlcanceEmpresas() alcance: Alcance) {
    return this.service.findAll(filtro, alcance);
  }

  @ApiOperation({ summary: 'Sugiere las fechas del siguiente período para una frecuencia' })
  @Get('sugerencia')
  sugerencia(@Query() { frecuenciaPagoId, empresaId }: SugerenciaPeriodoDto, @AlcanceEmpresas() alcance: Alcance) {
    return this.service.sugerencia(frecuenciaPagoId, alcance, empresaId);
  }

  @Get(':id')
  detalle(@Param('id', ParseIntPipe) id: number, @AlcanceEmpresas() alcance: Alcance) {
    return this.service.detalle(id, alcance);
  }

  @Post()
  create(@Body() dto: CreatePeriodoNominaDto, @AlcanceEmpresas() alcance: Alcance) {
    return this.service.create(dto, alcance);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePeriodoNominaDto,
    @AlcanceEmpresas() alcance: Alcance,
  ) {
    return this.service.update(id, dto, alcance);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @AlcanceEmpresas() alcance: Alcance) {
    return this.service.remove(id, alcance);
  }

  @ApiOperation({ summary: 'Calcula las nóminas del período (ABIERTO → PROCESADO)' })
  @Post(':id/procesar')
  @HttpCode(200)
  async procesar(@Param('id', ParseIntPipe) id: number, @AlcanceEmpresas() alcance: Alcance) {
    await this.service.findOne(id, alcance);
    return this.service.procesar(id);
  }

  @ApiOperation({ summary: 'Elimina las nóminas calculadas (PROCESADO → ABIERTO)' })
  @Post(':id/revertir')
  @HttpCode(200)
  async revertir(@Param('id', ParseIntPipe) id: number, @AlcanceEmpresas() alcance: Alcance) {
    await this.service.findOne(id, alcance);
    return this.service.revertir(id);
  }

  @ApiOperation({ summary: 'Confirma el pago: aplica adelantos y rebaja préstamos (PROCESADO → CERRADO)' })
  @Roles(RolNombre.ADMIN)
  @Post(':id/cerrar')
  @HttpCode(200)
  async cerrar(@Param('id', ParseIntPipe) id: number, @AlcanceEmpresas() alcance: Alcance) {
    await this.service.findOne(id, alcance);
    return this.service.cerrar(id);
  }

  @ApiOperation({ summary: 'Anula un período pagado: devuelve adelantos y saldos (CERRADO → ANULADO)' })
  @Roles(RolNombre.ADMIN)
  @Post(':id/anular')
  @HttpCode(200)
  async anular(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AnularDto,
    @CurrentUser() user: AuthUser,
    @AlcanceEmpresas() alcance: Alcance,
  ) {
    await this.service.findOne(id, alcance);
    return this.service.anular(id, dto.motivo, user.id);
  }

  @ApiOperation({ summary: 'Emite una boleta nueva para un empleado cuya boleta se anuló en este período' })
  @Post(':id/reemitir/:empleadoId')
  async reemitir(
    @Param('id', ParseIntPipe) id: number,
    @Param('empleadoId', ParseIntPipe) empleadoId: number,
    @AlcanceEmpresas() alcance: Alcance,
  ) {
    await this.service.findOne(id, alcance);
    return this.service.reemitir(id, empleadoId);
  }
}
