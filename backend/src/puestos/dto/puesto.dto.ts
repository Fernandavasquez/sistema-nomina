import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, Length, MaxLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CreatePuestoDto {
  @ApiProperty({ example: 'Piloto' })
  @Transform(trim)
  @IsString()
  @Length(2, 100)
  nombre: string;

  @ApiPropertyOptional({ example: 'Conduce el camión de reparto' })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(255)
  descripcion?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @ApiPropertyOptional({ default: false, description: 'Sus empleados pueden recibir viáticos (ej. Piloto)' })
  @IsOptional()
  @IsBoolean()
  recibeViaticos?: boolean;
}

export class UpdatePuestoDto extends PartialType(CreatePuestoDto) {}
