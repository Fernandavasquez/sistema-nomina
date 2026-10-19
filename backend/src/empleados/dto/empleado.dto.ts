import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';
import { EstadoEmpleado } from '../../common/enums.js';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
/** Para campos obligatorios: null se trata como vacío, así no se puede borrar el dato al editar. */
const requerido = ({ value }: { value: unknown }) => (value === null ? '' : trim({ value }));
/** Convierte '' en null: un campo opcional vacío en el formulario borra el valor en vez de fallar la validación. */
const emptyToNull = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? null : trim({ value });

export class CreateEmpleadoDto {
  @ApiProperty({ example: 'Juan Carlos' })
  @Transform(trim)
  @IsString()
  @Length(2, 100)
  nombres: string;

  @ApiProperty({ example: 'Pérez García' })
  @Transform(trim)
  @IsString()
  @Length(2, 100)
  apellidos: string;

  @ApiProperty({ example: '2547896541201', description: 'DPI de 13 dígitos sin espacios' })
  @Transform(({ value }) => (typeof value === 'string' ? value.replace(/\s|-/g, '') : value))
  @Matches(/^\d{13}$/, { message: 'El DPI debe tener exactamente 13 dígitos' })
  dpi: string;

  @ApiProperty({ example: '55551234' })
  @Transform(requerido)
  @Matches(/^[\d\s+()-]{8,20}$/, { message: 'Ingrese un teléfono válido (8 a 20 dígitos)' })
  telefono: string;

  @ApiPropertyOptional({ example: 'juan.perez@correo.com' })
  @Transform(emptyToNull)
  @IsOptional()
  @IsEmail({}, { message: 'Correo electrónico inválido' })
  email?: string;

  @ApiProperty({ example: 'Zona 1, Ciudad de Guatemala' })
  @Transform(requerido)
  @IsString()
  @Length(5, 255, { message: 'Ingrese la dirección (5 a 255 caracteres)' })
  direccion: string;

  @ApiProperty({ example: '2026-01-15' })
  @IsDateString({ strict: true }, { message: 'Fecha de ingreso inválida (use AAAA-MM-DD)' })
  fechaIngreso: string;

  @ApiProperty({
    example: 3000,
    description: 'Salario mensual. El pago semanal (÷30×7) o quincenal (÷2) se calcula solo.',
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El salario debe ser un número con máximo 2 decimales' })
  @IsPositive({ message: 'El salario debe ser mayor a 0' })
  salarioMensual: number;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  puestoId: number;

  @ApiProperty({ example: 1, description: '1 = SEMANAL, 2 = QUINCENAL' })
  @Type(() => Number)
  @IsInt()
  frecuenciaPagoId: number;

  @ApiPropertyOptional({ example: 'Banco Industrial' })
  @Transform(emptyToNull)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  bancoDestino?: string;

  @ApiPropertyOptional({ example: '0123456789' })
  @Transform(emptyToNull)
  @IsOptional()
  @Matches(/^[\d-]{4,30}$/, { message: 'Número de cuenta inválido (solo dígitos y guiones)' })
  numeroCuenta?: string;

  @ApiPropertyOptional({ enum: EstadoEmpleado, default: EstadoEmpleado.ACTIVO })
  @IsOptional()
  @IsEnum(EstadoEmpleado)
  estado?: EstadoEmpleado;
}

export class UpdateEmpleadoDto extends PartialType(CreateEmpleadoDto) {}

export class FiltroEmpleadosDto {
  @ApiPropertyOptional({ description: 'Busca por nombre, apellido o DPI' })
  @IsOptional()
  @IsString()
  buscar?: string;

  @ApiPropertyOptional({ enum: EstadoEmpleado })
  @IsOptional()
  @IsEnum(EstadoEmpleado)
  estado?: EstadoEmpleado;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  puestoId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  frecuenciaPagoId?: number;
}
