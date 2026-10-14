import { Body, Controller, Get, HttpCode, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator.js';
import { Public } from '../common/decorators/public.decorator.js';
import { AuthService } from './auth.service.js';
import { CambiarPasswordDto } from './dto/cambiar-password.dto.js';
import { LoginDto } from './dto/login.dto.js';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** Máximo 10 intentos por minuto por IP para frenar ataques de fuerza bruta. */
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @ApiBearerAuth()
  @Get('perfil')
  perfil(@CurrentUser() user: AuthUser) {
    return this.auth.perfil(user.id);
  }

  @ApiBearerAuth()
  @Patch('cambiar-password')
  cambiarPassword(@CurrentUser() user: AuthUser, @Body() dto: CambiarPasswordDto) {
    return this.auth.cambiarPassword(user.id, dto);
  }
}
