import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { Usuario } from '../usuarios/entities/usuario.entity.js';
import { CambiarPasswordDto } from './dto/cambiar-password.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { JwtPayload } from './jwt.strategy.js';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Usuario) private readonly usuarios: Repository<Usuario>,
    private readonly jwt: JwtService,
  ) {}

  async login({ usuario, password }: LoginDto) {
    const identificador = usuario.trim().toLowerCase();
    const user = await this.usuarios
      .createQueryBuilder('u')
      .addSelect('u.password')
      .leftJoinAndSelect('u.rol', 'rol')
      .where('LOWER(u.username) = :identificador OR LOWER(u.email) = :identificador', { identificador })
      .getOne();

    // Mismo mensaje para usuario inexistente y contraseña incorrecta (no revelar cuál falló).
    const valido = user ? await bcrypt.compare(password, user.password) : false;
    if (!user || !valido) throw new UnauthorizedException('Usuario o contraseña incorrectos');
    if (!user.isActive || !user.rol.isActive) throw new UnauthorizedException('El usuario está desactivado');

    await this.usuarios.update(user.id, { ultimoAcceso: new Date() });

    const payload: JwtPayload = { sub: user.id, username: user.username, rol: user.rol.nombre };
    const { password: _omit, ...perfil } = user;
    return { accessToken: await this.jwt.signAsync(payload), usuario: perfil };
  }

  async perfil(id: number) {
    return this.usuarios.findOneOrFail({ where: { id } });
  }

  async cambiarPassword(id: number, dto: CambiarPasswordDto) {
    const user = await this.usuarios
      .createQueryBuilder('u')
      .addSelect('u.password')
      .where('u.id = :id', { id })
      .getOneOrFail();

    if (!(await bcrypt.compare(dto.passwordActual, user.password))) {
      throw new BadRequestException('La contraseña actual no es correcta');
    }
    await this.usuarios.update(id, { password: await bcrypt.hash(dto.passwordNueva, 10) });
    return { message: 'Contraseña actualizada' };
  }
}
