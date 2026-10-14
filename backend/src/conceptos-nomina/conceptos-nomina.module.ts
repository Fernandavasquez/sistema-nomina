import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NominaDetalle } from '../nominas/entities/nomina-detalle.entity.js';
import { ConceptosNominaController } from './conceptos-nomina.controller.js';
import { ConceptoNomina } from './entities/concepto-nomina.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([ConceptoNomina, NominaDetalle])],
  controllers: [ConceptosNominaController],
})
export class ConceptosNominaModule {}
