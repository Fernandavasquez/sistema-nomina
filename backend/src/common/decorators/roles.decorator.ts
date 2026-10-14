import { SetMetadata } from '@nestjs/common';
import { RolNombre } from '../enums.js';

export const ROLES_KEY = 'roles';

/** Restringe una ruta (o un controlador completo) a los roles indicados. */
export const Roles = (...roles: RolNombre[]) => SetMetadata(ROLES_KEY, roles);
