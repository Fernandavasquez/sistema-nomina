import { ApiProperty, ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsDateString, IsInt, IsNumber, IsOptional, IsPositive, IsString, Length, MaxLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CreateViaticoDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  empleadoId: number;

  @ApiProperty({ example: 'Quetzaltenango', description: 'Destino del viaje' })
  @Transform(trim)
  @IsString()
  @Length(2, 150, { message: 'Ingrese el destino (2 a 150 caracteres)' })
  destino: string;

  @ApiProperty({ example: 'Entrega de materiales a cliente', description: 'Motivo del viaje' })
  @Transform(trim)
  @IsString()
  @Length(3, 500, { message: 'Ingrese el asunto (3 a 500 caracteres)' })
  asunto: string;

  @ApiProperty({ example: '2026-11-05', description: 'Día en que se entregó el viático' })
  @IsDateString({ strict: true }, { message: 'Fecha de entrega inválida (use AAAA-MM-DD)' })
  fechaEntrega: string;

  @ApiProperty({ example: '2026-11-08', description: 'Hasta qué día dura el viaje' })
  @IsDateString({ strict: true }, { message: 'Fecha "hasta" inválida (use AAAA-MM-DD)' })
  fechaHasta: string;

  @ApiProperty({ example: 450 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'La cantidad debe tener máximo 2 decimales' })
  @IsPositive({ message: 'La cantidad debe ser mayor a 0' })
  monto: number;
}

/** El empleado no se cambia: si se equivocó de empleado, se elimina y se registra de nuevo. */
export class UpdateViaticoDto extends PartialType(OmitType(CreateViaticoDto, ['empleadoId'] as const)) {}

export class FiltroViaticosDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  empleadoId?: number;

  @ApiPropertyOptional({ example: '2026-11-01', description: 'Entregados desde esta fecha' })
  @IsOptional()
  @IsDateString({ strict: true })
  desde?: string;

  @ApiPropertyOptional({ example: '2026-11-30', description: 'Entregados hasta esta fecha' })
  @IsOptional()
  @IsDateString({ strict: true })
  hasta?: string;

  @ApiPropertyOptional({ description: 'Busca en el destino o el asunto' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  buscar?: string;
}
