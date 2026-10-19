import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, Length } from 'class-validator';

/** Motivo obligatorio para anular un período o una boleta (queda en el historial). */
export class AnularDto {
  @ApiProperty({ example: 'Se cerró con el salario equivocado de un empleado', minLength: 10 })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(10, 500, { message: 'Explique el motivo en al menos 10 caracteres (máximo 500)' })
  motivo: string;
}
