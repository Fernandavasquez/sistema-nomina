import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConceptoNomina } from '../conceptos-nomina/entities/concepto-nomina.entity.js';
import { PeriodosNominaModule } from '../periodos-nomina/periodos-nomina.module.js';
import { NominaDetalle } from './entities/nomina-detalle.entity.js';
import { NominaEncabezado } from './entities/nomina-encabezado.entity.js';
import { NominasController } from './nominas.controller.js';
import { NominasService } from './nominas.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([NominaEncabezado, NominaDetalle, ConceptoNomina]), PeriodosNominaModule],
  controllers: [NominasController],
  providers: [NominasService],
})
export class NominasModule {}
