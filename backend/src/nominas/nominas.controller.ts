import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { RolNombre } from '../common/enums.js';
import { AnularDto } from '../periodos-nomina/dto/anular.dto.js';
import { PeriodosNominaService } from '../periodos-nomina/periodos-nomina.service.js';
import { AgregarDetalleDto, CambiarMetodoPagoDto, FiltroNominasDto } from './dto/nomina.dto.js';
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

  @ApiOperation({ summary: 'Anula la boleta pagada de un empleado (devuelve sus adelantos y saldos)' })
  @Roles(RolNombre.ADMIN)
  @Post(':id/anular')
  @HttpCode(200)
  anular(@Param('id', ParseIntPipe) id: number, @Body() dto: AnularDto, @CurrentUser() user: AuthUser) {
    return this.periodos.anularNomina(id, dto.motivo, user.id);
  }

  @ApiOperation({ summary: 'Confirma el pago de una boleta nueva emitida en un período cerrado' })
  @Roles(RolNombre.ADMIN)
  @Post(':id/confirmar')
  @HttpCode(200)
  confirmar(@Param('id', ParseIntPipe) id: number) {
    return this.periodos.confirmarNomina(id);
  }

  @ApiOperation({ summary: 'Descarta una boleta nueva que aún no se confirmó' })
  @Delete(':id')
  descartar(@Param('id', ParseIntPipe) id: number) {
    return this.periodos.descartarNomina(id);
  }

  @ApiOperation({ summary: 'Cambia la forma de pago de la boleta: EFECTIVO o DEPOSITO' })
  @Patch(':id/metodo-pago')
  cambiarMetodoPago(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CambiarMetodoPagoDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.cambiarMetodoPago(id, dto, user);
  }
}
