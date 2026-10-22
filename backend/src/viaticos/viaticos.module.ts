import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Empleado } from '../empleados/entities/empleado.entity.js';
import { Viatico } from './entities/viatico.entity.js';
import { ViaticosController } from './viaticos.controller.js';
import { ViaticosService } from './viaticos.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Viatico, Empleado])],
  controllers: [ViaticosController],
  providers: [ViaticosService],
})
export class ViaticosModule {}
