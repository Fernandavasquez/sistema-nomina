import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TipoFrecuenciaPago } from './entities/tipo-frecuencia-pago.entity.js';
import { FrecuenciasPagoController } from './frecuencias-pago.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([TipoFrecuenciaPago])],
  controllers: [FrecuenciasPagoController],
})
export class FrecuenciasPagoModule {}
