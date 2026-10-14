import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Roles } from '../common/decorators/roles.decorator.js';
import { RolNombre } from '../common/enums.js';
import { Rol } from './entities/rol.entity.js';

/** Los roles son fijos (ADMIN y OPERADOR) porque los permisos dependen de ellos en el código. */
@ApiTags('Roles')
@ApiBearerAuth()
@Roles(RolNombre.ADMIN)
@Controller('roles')
export class RolesController {
  constructor(@InjectRepository(Rol) private readonly roles: Repository<Rol>) {}

  @Get()
  findAll() {
    return this.roles.find({ order: { id: 'ASC' } });
  }
}
