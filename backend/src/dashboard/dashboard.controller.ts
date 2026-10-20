import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { type Alcance, AlcanceEmpresas } from '../common/decorators/alcance.decorator.js';
import { DashboardService } from './dashboard.service.js';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get('resumen')
  resumen(@AlcanceEmpresas() alcance: Alcance) {
    return this.service.resumen(alcance);
  }
}
