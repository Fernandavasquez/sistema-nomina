import { Column, Entity, Index, JoinColumn, ManyToOne, type Relation } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';
import { EstadoPrestamo } from '../../common/enums.js';
import { moneyColumn } from '../../common/utils/money.js';
import { Empleado } from '../../empleados/entities/empleado.entity.js';

@Entity('prestamos')
export class Prestamo extends BaseEntity {
  @Index()
  @Column()
  empleadoId: number;

  @ManyToOne(() => Empleado, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'empleado_id' })
  empleado: Relation<Empleado>;

  @Column(moneyColumn)
  montoTotal: number;

  /** Descuento fijo que se aplica en cada período de pago. */
  @Column(moneyColumn)
  montoCuota: number;

  /** Saldo actual por pagar. Se rebaja al cerrar cada período. */
  @Column(moneyColumn)
  saldoPendiente: number;

  @Column({ type: 'date' })
  fechaSolicitud: string;

  @Index()
  @Column({ type: 'enum', enum: EstadoPrestamo, default: EstadoPrestamo.ACTIVO })
  estado: EstadoPrestamo;

  @Column({ type: 'text', nullable: true })
  observacion: string | null;
}
