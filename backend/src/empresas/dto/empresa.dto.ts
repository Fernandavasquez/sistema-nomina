import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, Length, MaxLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
/** Un campo opcional vacío en el formulario se guarda como null. */
const vacioANull = ({ value }: { value: unknown }) =>
  typeof value === 'string' && !value.trim() ? null : trim({ value });

export class CreateEmpresaDto {
  @ApiProperty({ example: 'Surtimateriales el Marfil' })
  @Transform(trim)
  @IsString()
  @Length(2, 150, { message: 'El nombre debe tener de 2 a 150 caracteres' })
  nombre: string;

  @ApiPropertyOptional({ example: '1234567-8' })
  @Transform(vacioANull)
  @IsOptional()
  @IsString()
  @MaxLength(20)
  nit?: string | null;

  @ApiPropertyOptional({ example: 'Km 15 carretera a El Salvador' })
  @Transform(vacioANull)
  @IsOptional()
  @IsString()
  @MaxLength(255)
  direccion?: string | null;

  @ApiPropertyOptional({ example: '2222 3333' })
  @Transform(vacioANull)
  @IsOptional()
  @IsString()
  @MaxLength(20)
  telefono?: string | null;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

export class UpdateEmpresaDto extends PartialType(CreateEmpresaDto) {}
