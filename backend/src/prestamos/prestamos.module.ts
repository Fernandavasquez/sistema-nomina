import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Empleado } from '../empleados/entities/empleado.entity.js';
import { NominaDetalle } from '../nominas/entities/nomina-detalle.entity.js';
import { Prestamo } from './entities/prestamo.entity.js';
import { PrestamosController } from './prestamos.controller.js';
import { PrestamosService } from './prestamos.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Prestamo, Empleado, NominaDetalle])],
  controllers: [PrestamosController],
  providers: [PrestamosService],
})
export class PrestamosModule {}
