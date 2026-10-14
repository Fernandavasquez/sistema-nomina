import { ApiProperty, ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsInt, IsNumber, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';

export class CreateAdelantoDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  empleadoId: number;

  @ApiProperty({ example: 300 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El monto debe tener máximo 2 decimales' })
  @IsPositive({ message: 'El monto debe ser mayor a 0' })
  monto: number;

  @ApiPropertyOptional({ example: '2026-10-14', description: 'Por defecto, la fecha de hoy' })
  @IsOptional()
  @IsDateString({ strict: true })
  fechaSolicitud?: string;

  @ApiPropertyOptional({ example: 'Emergencia familiar' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  observacion?: string;
}

export class UpdateAdelantoDto extends PartialType(OmitType(CreateAdelantoDto, ['empleadoId'] as const)) {}

export class FiltroAdelantosDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  empleadoId?: number;

  @ApiPropertyOptional({ description: 'true = ya descontados, false = pendientes' })
  @IsOptional()
  @Transform(({ value }) => (value === 'true' ? true : value === 'false' ? false : value))
  @IsBoolean()
  aplicado?: boolean;
}
