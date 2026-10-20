import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdelantosModule } from './adelantos/adelantos.module.js';
import { AppController } from './app.controller.js';
import { AuthModule } from './auth/auth.module.js';
import { JwtAuthGuard } from './auth/jwt-auth.guard.js';
import { TypeOrmExceptionFilter } from './common/filters/typeorm-exception.filter.js';
import { RolesGuard } from './common/guards/roles.guard.js';
import { ConceptosNominaModule } from './conceptos-nomina/conceptos-nomina.module.js';
import { DashboardModule } from './dashboard/dashboard.module.js';
import { SeedService } from './database/seed.service.js';
import { buildTypeOrmOptions } from './database/typeorm.options.js';
import { EmpleadosModule } from './empleados/empleados.module.js';
import { EmpresasModule } from './empresas/empresas.module.js';
import { FrecuenciasPagoModule } from './frecuencias-pago/frecuencias-pago.module.js';
import { NominasModule } from './nominas/nominas.module.js';
import { PeriodosNominaModule } from './periodos-nomina/periodos-nomina.module.js';
import { PrestamosModule } from './prestamos/prestamos.module.js';
import { PuestosModule } from './puestos/puestos.module.js';
import { ReportesModule } from './reportes/reportes.module.js';
import { RolesModule } from './roles/roles.module.js';
import { UsuariosModule } from './usuarios/usuarios.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        ...buildTypeOrmOptions(),
        // Aplica las migraciones pendientes al arrancar (crea/actualiza las tablas).
        migrationsRun: true,
      }),
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 300 }]),
    AuthModule,
    UsuariosModule,
    RolesModule,
    EmpresasModule,
    PuestosModule,
    FrecuenciasPagoModule,
    ConceptosNominaModule,
    EmpleadosModule,
    AdelantosModule,
    PrestamosModule,
    PeriodosNominaModule,
    NominasModule,
    DashboardModule,
    ReportesModule,
  ],
  controllers: [AppController],
  providers: [
    SeedService,
    // El orden importa: primero límite de peticiones, luego autenticación JWT y al final roles.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_FILTER, useClass: TypeOrmExceptionFilter },
  ],
})
export class AppModule {}
