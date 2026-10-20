import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Adelanto } from '../adelantos/entities/adelanto.entity.js';
import { TipoFrecuenciaPago } from '../frecuencias-pago/entities/tipo-frecuencia-pago.entity.js';
import { NominaEncabezado } from '../nominas/entities/nomina-encabezado.entity.js';
import { Prestamo } from '../prestamos/entities/prestamo.entity.js';
import { Puesto } from '../puestos/entities/puesto.entity.js';
import { EmpleadosController } from './empleados.controller.js';
import { EmpleadosService } from './empleados.service.js';
import { Empresa } from '../empresas/entities/empresa.entity.js';
import { Empleado } from './entities/empleado.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Empleado, Puesto, TipoFrecuenciaPago, Adelanto, Prestamo, NominaEncabezado, Empresa]),
  ],
  controllers: [EmpleadosController],
  providers: [EmpleadosService],
})
export class EmpleadosModule {}
