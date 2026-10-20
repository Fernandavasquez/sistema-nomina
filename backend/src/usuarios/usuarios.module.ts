import { Empresa } from '../empresas/entities/empresa.entity.js';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Rol } from '../roles/entities/rol.entity.js';
import { Usuario } from './entities/usuario.entity.js';
import { UsuariosController } from './usuarios.controller.js';
import { UsuariosService } from './usuarios.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Usuario, Rol, Empresa])],
  controllers: [UsuariosController],
  providers: [UsuariosService],
})
export class UsuariosModule {}
