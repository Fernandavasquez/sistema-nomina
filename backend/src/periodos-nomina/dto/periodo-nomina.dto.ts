import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional } from 'class-validator';
import { EstadoPeriodo } from '../../common/enums.js';

export class CreatePeriodoNominaDto {
  @ApiPropertyOptional({
    example: 1,
    description: 'Empresa. Si se omite, la seleccionada en el menú (encabezado X-Empresa-Id).',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  empresaId?: number;

  @ApiProperty({ example: 1, description: '1 = SEMANAL, 2 = QUINCENAL' })
  @Type(() => Number)
  @IsInt()
  frecuenciaPagoId: number;

  @ApiProperty({ example: '2026-10-12' })
  @IsDateString({ strict: true })
  fechaInicio: string;

  @ApiPropertyOptional({ description: 'Si se omite se calcula según la frecuencia' })
  @IsOptional()
  @IsDateString({ strict: true })
  fechaFin?: string;

  @ApiPropertyOptional({ description: 'Si se omite, igual a la fecha fin' })
  @IsOptional()
  @IsDateString({ strict: true })
  fechaPago?: string;
}

export class UpdatePeriodoNominaDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString({ strict: true })
  fechaInicio?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString({ strict: true })
  fechaFin?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString({ strict: true })
  fechaPago?: string;
}

export class FiltroPeriodosDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  frecuenciaPagoId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  anio?: number;

  @ApiPropertyOptional({ enum: EstadoPeriodo })
  @IsOptional()
  @IsEnum(EstadoPeriodo)
  estado?: EstadoPeriodo;
}

export class SugerenciaPeriodoDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  frecuenciaPagoId: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'Empresa. Si se omite, la seleccionada en el menú (encabezado X-Empresa-Id).',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  empresaId?: number;
}
