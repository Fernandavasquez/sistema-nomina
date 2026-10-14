import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';
import { EstadoPrestamo } from '../../common/enums.js';

export class CreatePrestamoDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  empleadoId: number;

  @ApiProperty({ example: 3000 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive({ message: 'El monto total debe ser mayor a 0' })
  montoTotal: number;

  @ApiProperty({ example: 250, description: 'Descuento fijo por cada período de pago' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive({ message: 'La cuota debe ser mayor a 0' })
  montoCuota: number;

  @ApiPropertyOptional({ example: '2026-10-14', description: 'Por defecto, la fecha de hoy' })
  @IsOptional()
  @IsDateString({ strict: true })
  fechaSolicitud?: string;

  @ApiPropertyOptional({ example: 'Préstamo para útiles escolares' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  observacion?: string;
}

/** Solo se puede ajustar la cuota y la observación; el monto total no cambia después de otorgado. */
export class UpdatePrestamoDto {
  @ApiPropertyOptional({ example: 300 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  montoCuota?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  observacion?: string;
}

export class CancelarPrestamoDto {
  @ApiProperty({ example: 'El empleado pagó el saldo en efectivo' })
  @IsString()
  @MaxLength(500)
  motivo: string;
}

export class FiltroPrestamosDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  empleadoId?: number;

  @ApiPropertyOptional({ enum: EstadoPrestamo })
  @IsOptional()
  @IsEnum(EstadoPrestamo)
  estado?: EstadoPrestamo;
}
