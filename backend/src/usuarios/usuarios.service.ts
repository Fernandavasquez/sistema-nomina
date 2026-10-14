import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { Rol } from '../roles/entities/rol.entity.js';
import { CreateUsuarioDto } from './dto/create-usuario.dto.js';
import { UpdateUsuarioDto } from './dto/update-usuario.dto.js';
import { Usuario } from './entities/usuario.entity.js';

@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario) private readonly usuarios: Repository<Usuario>,
    @InjectRepository(Rol) private readonly roles: Repository<Rol>,
  ) {}

  findAll() {
    return this.usuarios.find({ order: { nombre: 'ASC', apellido: 'ASC' } });
  }

  async findOne(id: number) {
    const usuario = await this.usuarios.findOne({ where: { id } });
    if (!usuario) throw new NotFoundException(`Usuario ${id} no encontrado`);
    return usuario;
  }

  async create(dto: CreateUsuarioDto) {
    await this.assertRol(dto.rolId);
    await this.assertUnico(dto.username, dto.email);
    const usuario = this.usuarios.create({ ...dto, password: await bcrypt.hash(dto.password, 10) });
    const { id } = await this.usuarios.save(usuario);
    return this.findOne(id);
  }

  async update(id: number, dto: UpdateUsuarioDto, actorId: number) {
    const usuario = await this.findOne(id);
    if (id === actorId && (dto.isActive === false || (dto.rolId && dto.rolId !== usuario.rolId))) {
      throw new BadRequestException('No puede desactivarse ni cambiar su propio rol');
    }
    if (dto.rolId) await this.assertRol(dto.rolId);
    await this.assertUnico(dto.username, dto.email, id);

    const { password, ...cambios } = dto;
    Object.assign(usuario, cambios);
    if (password) usuario.password = await bcrypt.hash(password, 10);
    // Evita que TypeORM intente guardar la relación cargada en lugar de rolId.
    const { rol: _rol, ...datos } = usuario;
    await this.usuarios.save(datos);
    return this.findOne(id);
  }

  async remove(id: number, actorId: number) {
    if (id === actorId) throw new BadRequestException('No puede eliminar su propio usuario');
    const usuario = await this.findOne(id);
    await this.usuarios.remove(usuario);
    return { message: 'Usuario eliminado' };
  }

  private async assertRol(rolId: number) {
    if (!(await this.roles.existsBy({ id: rolId }))) throw new BadRequestException(`El rol ${rolId} no existe`);
  }

  private async assertUnico(username?: string, email?: string, exceptoId?: number) {
    const where = [...(username ? [{ username }] : []), ...(email ? [{ email }] : [])];
    // Sin condiciones, find() devolvería TODOS los usuarios: no hay nada que validar.
    if (!where.length) return;
    const conflictos = await this.usuarios.find({ where });
    const otro = conflictos.find((u) => u.id !== exceptoId);
    if (otro) {
      throw new ConflictException(
        otro.username === username ? 'El nombre de usuario ya está en uso' : 'El correo ya está en uso',
      );
    }
  }
}
