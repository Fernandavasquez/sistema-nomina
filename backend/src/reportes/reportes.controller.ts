import { Controller, Get, Param, ParseIntPipe, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { type Alcance, AlcanceEmpresas } from '../common/decorators/alcance.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { RolNombre } from '../common/enums.js';
import {
  FormatoDto,
  RangoFechasDto,
  ReporteAdelantosDto,
  ReporteEmpleadosDto,
  ReportePrestamosDto,
} from './dto/reporte.dto.js';
import { reporteAExcel } from './exportadores/excel.js';
import { reporteAPdf } from './exportadores/pdf.js';
import type { FormatoReporte, Reporte } from './reporte.types.js';
import { ReportesService } from './reportes.service.js';

const TIPOS: Record<Exclude<FormatoReporte, 'json'>, string> = {
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pdf: 'application/pdf',
};

/**
 * Reportes para el administrador. Cada ruta acepta ?formato=json (vista previa),
 * ?formato=xlsx (Excel) o ?formato=pdf (PDF).
 */
@ApiTags('Reportes')
@ApiBearerAuth()
@ApiProduces('application/json', TIPOS.xlsx, TIPOS.pdf)
@Roles(RolNombre.ADMIN)
@Controller('reportes')
export class ReportesController {
  constructor(private readonly service: ReportesService) {}

  @ApiOperation({ summary: 'Planilla de un período: detalle por empleado y totales por banco' })
  @Get('planilla/:periodoId')
  async planilla(
    @Param('periodoId', ParseIntPipe) periodoId: number,
    @Query() q: FormatoDto,
    @AlcanceEmpresas() alcance: Alcance,
    @Res() res: Response,
  ) {
    return this.responder(res, await this.service.planilla(periodoId, alcance), q.formato);
  }

  @ApiOperation({ summary: 'Total pagado a cada empleado en un rango de fechas (períodos cerrados)' })
  @Get('pagos')
  async pagos(@Query() q: RangoFechasDto, @AlcanceEmpresas() alcance: Alcance, @Res() res: Response) {
    return this.responder(res, await this.service.pagos(q, alcance), q.formato);
  }

  @ApiOperation({ summary: 'Adelantos entregados en un rango de fechas' })
  @Get('adelantos')
  async adelantos(@Query() q: ReporteAdelantosDto, @AlcanceEmpresas() alcance: Alcance, @Res() res: Response) {
    return this.responder(res, await this.service.adelantos(q, alcance), q.formato);
  }

  @ApiOperation({ summary: 'Cartera de préstamos: prestado, pagado y saldo' })
  @Get('prestamos')
  async prestamos(@Query() q: ReportePrestamosDto, @AlcanceEmpresas() alcance: Alcance, @Res() res: Response) {
    return this.responder(res, await this.service.prestamos(q, alcance), q.formato);
  }

  @ApiOperation({ summary: 'Listado de empleados con salario y datos bancarios' })
  @Get('empleados')
  async empleados(@Query() q: ReporteEmpleadosDto, @AlcanceEmpresas() alcance: Alcance, @Res() res: Response) {
    return this.responder(res, await this.service.empleados(q, alcance), q.formato);
  }

  private async responder(res: Response, reporte: Reporte, formato: FormatoReporte = 'json') {
    if (formato === 'json') return res.json(reporte);

    const archivo = formato === 'xlsx' ? await reporteAExcel(reporte) : await reporteAPdf(reporte);
    res.set({
      'Content-Type': TIPOS[formato],
      'Content-Disposition': `attachment; filename="${reporte.nombreArchivo}.${formato}"`,
      'Content-Length': String(archivo.length),
      'Cache-Control': 'no-store',
    });
    return res.send(archivo);
  }
}
