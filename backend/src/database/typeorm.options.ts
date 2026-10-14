import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DataSourceOptions } from 'typeorm';
import { SnakeNamingStrategy } from './snake-naming.strategy.js';

const here = dirname(fileURLToPath(import.meta.url));

/**
 * Opciones compartidas por la aplicación Nest y por el CLI de TypeORM (migraciones).
 * Se leen de variables de entorno para funcionar igual en local y en Docker.
 */
export function buildTypeOrmOptions(env: NodeJS.ProcessEnv = process.env): DataSourceOptions {
  return {
    type: 'postgres',
    host: env.DB_HOST ?? 'localhost',
    port: Number(env.DB_PORT ?? 5432),
    username: env.DB_USER ?? 'nomina',
    password: env.DB_PASSWORD ?? 'nomina',
    database: env.DB_NAME ?? 'nomina',
    namingStrategy: new SnakeNamingStrategy(),
    entities: [join(here, '..', '**', '*.entity.js')],
    migrations: [join(here, 'migrations', '*.js')],
    // Nunca sincronizar el esquema automáticamente: los cambios se hacen con migraciones.
    synchronize: false,
    logging: env.DB_LOGGING === 'true' ? ['query', 'error'] : ['error'],
  };
}
