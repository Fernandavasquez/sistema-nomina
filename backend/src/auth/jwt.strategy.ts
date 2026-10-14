import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import { AuthUser } from '../common/decorators/current-user.decorator.js';
import { Usuario } from '../usuarios/entities/usuario.entity.js';

export interface JwtPayload {
  sub: number;
  username: string;
  rol: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    @InjectRepository(Usuario) private readonly usuarios: Repository<Usuario>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  /**
   * Se ejecuta en cada petición con token válido. Volvemos a consultar al usuario
   * para que un usuario desactivado pierda el acceso de inmediato.
   */
  async validate(payload: JwtPayload): Promise<AuthUser> {
    const usuario = await this.usuarios.findOne({ where: { id: payload.sub } });
    if (!usuario || !usuario.isActive || !usuario.rol.isActive) {
      throw new UnauthorizedException('Usuario inactivo o inexistente');
    }
    return { id: usuario.id, username: usuario.username, rol: usuario.rol.nombre };
  }
}
