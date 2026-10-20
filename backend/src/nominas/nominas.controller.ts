import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { type Alcance, AlcanceEmpresas } from '../common/decorators/alcance.decorator.js';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { RolNombre } from '../common/enums.js';
import { AnularDto } from '../periodos-nomina/dto/anular.dto.js';
import { PeriodosNominaService } from '../periodos-nomina/periodos-nomina.service.js';
import { AgregarDetalleDto, CambiarMetodoPagoDto, FiltroNominasDto, RegistrarFaltasDto } from './dto/nomina.dto.js';
import { NominasService } from './nominas.service.js';

@ApiTags('Nóminas')
@ApiBearerAuth()
@Controller('nominas')
export class NominasController {
  constructor(
    private readonly service: NominasService,
    private readonly periodos: PeriodosNominaService,
  ) {}

  @Get()
  findAll(@Query() filtro: FiltroNominasDto, @AlcanceEmpresas() alcance: Alcance) {
    return this.service.findAll(filtro, alcance);
  }

  @ApiOperation({ summary: 'Boleta de pago con su detalle' })
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @AlcanceEmpresas() alcance: Alcance) {
    return this.service.findOne(id, alcance);
  }

  @ApiOperation({ summary: 'Agrega un bono o descuento manual' })
  @Post(':id/detalles')
  agregarDetalle(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AgregarDetalleDto,
    @AlcanceEmpresas() alcance: Alcance,
  ) {
    return this.service.agregarDetalle(id, dto, alcance);
  }

  @Delete(':id/detalles/:detalleId')
  eliminarDetalle(
    @Param('id', ParseIntPipe) id: number,
    @Param('detalleId', ParseIntPipe) detalleId: number,
    @AlcanceEmpresas() alcance: Alcance,
  ) {
    return this.service.eliminarDetalle(id, detalleId, alcance);
  }

  @ApiOperation({ summary: 'Anula la boleta pagada de un empleado (devuelve sus adelantos y saldos)' })
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
    return this.periodos.anularNomina(id, dto.motivo, user.id);
  }

  @ApiOperation({ summary: 'Confirma el pago de una boleta nueva emitida en un período cerrado' })
  @Roles(RolNombre.ADMIN)
  @Post(':id/confirmar')
  @HttpCode(200)
  async confirmar(@Param('id', ParseIntPipe) id: number, @AlcanceEmpresas() alcance: Alcance) {
    await this.service.findOne(id, alcance);
    return this.periodos.confirmarNomina(id);
  }

  @ApiOperation({ summary: 'Descarta una boleta nueva que aún no se confirmó' })
  @Delete(':id')
  async descartar(@Param('id', ParseIntPipe) id: number, @AlcanceEmpresas() alcance: Alcance) {
    await this.service.findOne(id, alcance);
    return this.periodos.descartarNomina(id);
  }

  @ApiOperation({ summary: 'Anota los días que faltó el empleado y recalcula el descuento' })
  @Patch(':id/faltas')
  registrarFaltas(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RegistrarFaltasDto,
    @AlcanceEmpresas() alcance: Alcance,
  ) {
    return this.service.registrarFaltas(id, dto, alcance);
  }

  @ApiOperation({ summary: 'Cambia la forma de pago de la boleta: EFECTIVO o DEPOSITO' })
  @Patch(':id/metodo-pago')
  cambiarMetodoPago(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CambiarMetodoPagoDto,
    @CurrentUser() user: AuthUser,
    @AlcanceEmpresas() alcance: Alcance,
  ) {
    return this.service.cambiarMetodoPago(id, dto, user, alcance);
  }
}
