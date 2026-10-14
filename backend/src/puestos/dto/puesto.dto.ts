import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, Length, MaxLength } from 'class-validator';

export class CreatePuestoDto {
  @ApiProperty({ example: 'Bodeguero' })
  @IsString()
  @Length(2, 100)
  nombre: string;

  @ApiPropertyOptional({ example: 'Encargado de inventario y despacho' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  descripcion?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

export class UpdatePuestoDto extends PartialType(CreatePuestoDto) {}
