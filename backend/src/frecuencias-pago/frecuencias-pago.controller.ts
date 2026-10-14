import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TipoFrecuenciaPago } from './entities/tipo-frecuencia-pago.entity.js';

/**
 * Las frecuencias (SEMANAL / QUINCENAL) son datos fijos creados por el seed:
 * el cálculo de fechas de los períodos depende de ellas, por eso solo se consultan.
 */
@ApiTags('Frecuencias de pago')
@ApiBearerAuth()
@Controller('frecuencias-pago')
export class FrecuenciasPagoController {
  constructor(@InjectRepository(TipoFrecuenciaPago) private readonly repo: Repository<TipoFrecuenciaPago>) {}

  @Get()
  findAll() {
    return this.repo.find({ order: { diasPeriodo: 'ASC' } });
  }
}
