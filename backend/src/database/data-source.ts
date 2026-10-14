import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { buildTypeOrmOptions } from './typeorm.options.js';

/**
 * DataSource usado por el CLI de TypeORM (ver scripts `migration:*` en package.json).
 * Carga el archivo .env si existe (Node >= 20.12).
 */
try {
  process.loadEnvFile();
} catch {
  // Sin .env: se usan las variables del entorno (por ejemplo dentro de Docker).
}

export default new DataSource(buildTypeOrmOptions());
