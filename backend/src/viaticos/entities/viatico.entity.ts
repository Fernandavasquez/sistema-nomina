import { Check, Column, Entity, Index, JoinColumn, ManyToOne, type Relation } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';
import { moneyColumn } from '../../common/utils/money.js';
import { Empleado } from '../../empleados/entities/empleado.entity.js';

/**
 * Dinero entregado a un empleado (normalmente un piloto) para los gastos de un viaje.
 * Es solo registro y control: no forma parte de la boleta de pago.
 */
@Entity('viaticos')
@Check('chk_viaticos_monto', '"monto" > 0')
@Check('chk_viaticos_fechas', '"fecha_hasta" >= "fecha_entrega"')
export class Viatico extends BaseEntity {
  @Index()
  @Column()
  empleadoId: number;

  @ManyToOne(() => Empleado, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'empleado_id' })
  empleado: Relation<Empleado>;

  /** A dónde va (ej. "Quetzaltenango"). */
  @Column({ type: 'varchar', length: 150 })
  destino: string;

  /** Motivo del viaje (ej. "Entrega de materiales a cliente"). */
  @Column({ type: 'varchar', length: 500 })
  asunto: string;

  /** Día en que se entregó el viático. */
  @Index()
  @Column({ type: 'date' })
  fechaEntrega: string;

  /** Hasta qué día dura el viaje que cubre el viático. */
  @Column({ type: 'date' })
  fechaHasta: string;

  @Column(moneyColumn)
  monto: number;
}
