import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';

@Entity('tipos_frecuencia_pago')
export class TipoFrecuenciaPago extends BaseEntity {
  /** SEMANAL | QUINCENAL */
  @Column({ type: 'varchar', length: 20, unique: true })
  codigo: string;

  @Column({ type: 'varchar', length: 50 })
  nombre: string;

  /** Días de referencia del período (7 o 15). */
  @Column({ type: 'int' })
  diasPeriodo: number;
}
