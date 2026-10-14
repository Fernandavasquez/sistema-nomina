import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsIn, IsOptional } from 'class-validator';
import { EstadoEmpleado, EstadoPrestamo } from '../../common/enums.js';
import type { FormatoReporte } from '../reporte.types.js';

export class FormatoDto {
  @ApiPropertyOptional({
    enum: ['json', 'xlsx', 'pdf'],
    default: 'json',
    description: 'json = vista previa; xlsx/pdf = descarga',
  })
  @IsOptional()
  @IsIn(['json', 'xlsx', 'pdf'], { message: 'El formato debe ser json, xlsx o pdf' })
  formato?: FormatoReporte;
}

export class RangoFechasDto extends FormatoDto {
  @ApiPropertyOptional({ example: '2026-10-01', description: 'Por defecto, el primer día del mes actual' })
  @IsOptional()
  @IsDateString({ strict: true })
  desde?: string;

  @ApiPropertyOptional({ example: '2026-10-31', description: 'Por defecto, hoy' })
  @IsOptional()
  @IsDateString({ strict: true })
  hasta?: string;
}

export class ReporteAdelantosDto extends RangoFechasDto {
  @ApiPropertyOptional({ enum: ['PENDIENTE', 'DESCONTADO'] })
  @IsOptional()
  @IsIn(['PENDIENTE', 'DESCONTADO'], { message: 'El estado debe ser PENDIENTE o DESCONTADO' })
  estado?: 'PENDIENTE' | 'DESCONTADO';
}

export class ReportePrestamosDto extends FormatoDto {
  @ApiPropertyOptional({ enum: EstadoPrestamo })
  @IsOptional()
  @IsEnum(EstadoPrestamo)
  estado?: EstadoPrestamo;
}

export class ReporteEmpleadosDto extends FormatoDto {
  @ApiPropertyOptional({ enum: EstadoEmpleado })
  @IsOptional()
  @IsEnum(EstadoEmpleado)
  estado?: EstadoEmpleado;
}
