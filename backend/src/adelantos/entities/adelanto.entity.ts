import { Check, Column, Entity, Index, JoinColumn, ManyToOne, type Relation } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';
import { moneyColumn } from '../../common/utils/money.js';
import { Empleado } from '../../empleados/entities/empleado.entity.js';

@Entity('adelantos')
// Reglas CHECK de la base de datos (creadas en la migración inicial).
@Check('chk_adelantos_monto', '"monto" > 0')
export class Adelanto extends BaseEntity {
  @Index()
  @Column()
  empleadoId: number;

  @ManyToOne(() => Empleado, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'empleado_id' })
  empleado: Relation<Empleado>;

  @Column(moneyColumn)
  monto: number;

  @Column({ type: 'date' })
  fechaSolicitud: string;

  /** false = pendiente de descontar · true = ya cobrado en una nómina cerrada. */
  @Index()
  @Column({ default: false })
  aplicado: boolean;

  @Column({ type: 'text', nullable: true })
  observacion: string | null;
}
