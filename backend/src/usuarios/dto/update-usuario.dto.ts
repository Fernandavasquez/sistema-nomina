import { PartialType } from '@nestjs/swagger';
import { CreateUsuarioDto } from './create-usuario.dto.js';

/** Todos los campos opcionales. Si se envía `password`, se restablece la contraseña. */
export class UpdateUsuarioDto extends PartialType(CreateUsuarioDto) {}
