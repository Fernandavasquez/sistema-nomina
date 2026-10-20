import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';

/**
 * Empresa del grupo (Surtimateriales el Marfil, Transportes Andrés…). Cada empleado y cada
 * período de pago pertenecen a una empresa; los puestos y conceptos se comparten entre todas.
 */
@Entity('empresas')
export class Empresa extends BaseEntity {
  @Column({ type: 'varchar', length: 150, unique: true })
  nombre: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  nit: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  direccion: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  telefono: string | null;

  /** Una empresa inactiva no aparece en el selector ni recibe empleados nuevos; su historial se conserva. */
  @Column({ default: true })
  activo: boolean;
}
