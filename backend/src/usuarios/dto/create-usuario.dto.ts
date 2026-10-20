import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsArray, IsBoolean, IsEmail, IsInt, IsOptional, IsString, Length, Matches, MinLength } from 'class-validator';

export class CreateUsuarioDto {
  @ApiProperty({ example: 'María' })
  @IsString()
  @Length(2, 100)
  nombre: string;

  @ApiProperty({ example: 'López' })
  @IsString()
  @Length(2, 100)
  apellido: string;

  @ApiProperty({ example: 'mlopez' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @Matches(/^[a-z0-9._-]{3,50}$/, {
    message: 'El usuario debe tener de 3 a 50 caracteres: letras, números, punto, guion o guion bajo',
  })
  username: string;

  @ApiProperty({ example: 'mlopez@empresa.com' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'Correo electrónico inválido' })
  email: string;

  @ApiProperty({ example: 'Operador123!', minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  password: string;

  @ApiProperty({ example: 2, description: 'Id del rol (1 = ADMIN, 2 = OPERADOR)' })
  @IsInt()
  rolId: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    example: [1, 2],
    description: 'Empresas que puede ver. El administrador ve todas sin importar esta lista.',
  })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  empresaIds?: number[];
}
