import { ApiProperty, ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString, Length, Matches } from 'class-validator';
import { TipoConcepto } from '../../common/enums.js';

export class CreateConceptoNominaDto {
  @ApiProperty({ example: 'HORAS_EXTRA' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @Matches(/^[A-Z0-9_]{2,30}$/, { message: 'El código solo admite MAYÚSCULAS, números y guion bajo' })
  codigo: string;

  @ApiProperty({ example: 'Horas extra' })
  @IsString()
  @Length(2, 100)
  nombre: string;

  @ApiProperty({ enum: TipoConcepto })
  @IsEnum(TipoConcepto)
  tipo: TipoConcepto;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

export class UpdateConceptoNominaDto extends PartialType(OmitType(CreateConceptoNominaDto, ['codigo'] as const)) {}
