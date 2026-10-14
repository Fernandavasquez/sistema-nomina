import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';

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
