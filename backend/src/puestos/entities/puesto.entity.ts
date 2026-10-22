import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';

@Entity('puestos')
export class Puesto extends BaseEntity {
  @Column({ type: 'varchar', length: 100, unique: true })
  nombre: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  descripcion: string | null;

  @Column({ default: true })
  activo: boolean;

  /** Los empleados de este puesto pueden recibir viáticos (por ejemplo, Piloto). */
  @Column({ default: false })
  recibeViaticos: boolean;
}
