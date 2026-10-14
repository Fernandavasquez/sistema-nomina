import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TipoFrecuenciaPago } from '../frecuencias-pago/entities/tipo-frecuencia-pago.entity.js';
import { NominaEncabezado } from '../nominas/entities/nomina-encabezado.entity.js';
import { PeriodoNomina } from './entities/periodo-nomina.entity.js';
import { PeriodosNominaController } from './periodos-nomina.controller.js';
import { PeriodosNominaService } from './periodos-nomina.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([PeriodoNomina, TipoFrecuenciaPago, NominaEncabezado])],
  controllers: [PeriodosNominaController],
  providers: [PeriodosNominaService],
  exports: [PeriodosNominaService],
})
export class PeriodosNominaModule {}
