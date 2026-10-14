import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from './common/decorators/public.decorator.js';

@ApiTags('Salud')
@Controller()
export class AppController {
  /** Endpoint público para comprobar que la API está viva (lo usa Docker en el healthcheck). */
  @Public()
  @Get('health')
  health() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
