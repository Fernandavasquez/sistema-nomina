import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Empleado } from '../empleados/entities/empleado.entity.js';
import { Puesto } from './entities/puesto.entity.js';
import { PuestosController } from './puestos.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Puesto, Empleado])],
  controllers: [PuestosController],
})
export class PuestosModule {}
