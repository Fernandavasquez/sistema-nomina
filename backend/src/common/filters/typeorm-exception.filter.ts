import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { QueryFailedError } from 'typeorm';

/**
 * Traduce errores de PostgreSQL a respuestas HTTP entendibles
 * (en vez de un 500 genérico).
 */
@Catch(QueryFailedError)
export class TypeOrmExceptionFilter implements ExceptionFilter {
  catch(exception: QueryFailedError & { code?: string; detail?: string }, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();

    const map: Record<string, [number, string]> = {
      '23505': [HttpStatus.CONFLICT, 'Ya existe un registro con esos datos'],
      '23503': [HttpStatus.CONFLICT, 'El registro está relacionado con otros datos y no se puede modificar o eliminar'],
      '22P02': [HttpStatus.BAD_REQUEST, 'Formato de dato inválido'],
    };
    const [statusCode, message] = map[exception.code ?? ''] ?? [
      HttpStatus.INTERNAL_SERVER_ERROR,
      'Error interno de base de datos',
    ];

    response.status(statusCode).json({ statusCode, message, detail: exception.detail });
  }
}
