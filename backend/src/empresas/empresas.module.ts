import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Empleado } from '../empleados/entities/empleado.entity.js';
import { PeriodoNomina } from '../periodos-nomina/entities/periodo-nomina.entity.js';
import { EmpresasController } from './empresas.controller.js';
import { EmpresasService } from './empresas.service.js';
import { Empresa } from './entities/empresa.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Empresa, Empleado, PeriodoNomina])],
  controllers: [EmpresasController],
  providers: [EmpresasService],
})
export class EmpresasModule {}
