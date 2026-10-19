import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNumber, IsOptional, IsPositive, IsString, MaxLength, Min } from 'class-validator';
import { MetodoPago } from '../../common/enums.js';

export class FiltroNominasDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  periodoId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  empleadoId?: number;
}

/** Línea manual (bono, horas extra, descuento por daño, etc.). */
export class AgregarDetalleDto {
  @ApiProperty({ example: 4, description: 'Id de un concepto que NO sea del sistema (ej. BONO)' })
  @Type(() => Number)
  @IsInt()
  conceptoId: number;

  @ApiProperty({ example: 150 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive({ message: 'El monto debe ser mayor a 0' })
  monto: number;

  @ApiPropertyOptional({ example: 'Bono por puntualidad' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  observacion?: string;
}

export class CambiarMetodoPagoDto {
  @ApiProperty({ enum: MetodoPago, example: MetodoPago.EFECTIVO })
  @IsEnum(MetodoPago, { message: 'La forma de pago debe ser EFECTIVO o DEPOSITO' })
  metodoPago: MetodoPago;
}

export class RegistrarFaltasDto {
  @ApiProperty({ example: 2, description: 'Días que faltó en el período (0 para quitar el descuento)' })
  @Type(() => Number)
  @IsInt({ message: 'Los días de falta deben ser un número entero' })
  @Min(0, { message: 'Los días de falta no pueden ser negativos' })
  diasFalta: number;
}
