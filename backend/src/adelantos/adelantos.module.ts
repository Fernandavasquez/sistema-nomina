import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Empleado } from '../empleados/entities/empleado.entity.js';
import { NominaDetalle } from '../nominas/entities/nomina-detalle.entity.js';
import { AdelantosController } from './adelantos.controller.js';
import { AdelantosService } from './adelantos.service.js';
import { Adelanto } from './entities/adelanto.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Adelanto, Empleado, NominaDetalle])],
  controllers: [AdelantosController],
  providers: [AdelantosService],
})
export class AdelantosModule {}
