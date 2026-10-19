import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, type Relation } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';
import { EstadoNomina, MetodoPago } from '../../common/enums.js';
import { moneyColumn } from '../../common/utils/money.js';
import { Empleado } from '../../empleados/entities/empleado.entity.js';
import { PeriodoNomina } from '../../periodos-nomina/entities/periodo-nomina.entity.js';
import { Usuario } from '../../usuarios/entities/usuario.entity.js';
import { NominaDetalle } from './nomina-detalle.entity.js';

@Entity('nominas_encabezado')
// Una boleta vigente por empleado y período; las anuladas no cuentan (se puede emitir una nueva).
@Index('uq_nomina_periodo_empleado', ['periodoId', 'empleadoId'], { unique: true, where: `"estado" <> 'ANULADA'` })
export class NominaEncabezado extends BaseEntity {
  @Column()
  periodoId: number;

  @ManyToOne(() => PeriodoNomina, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'periodo_id' })
  periodo: Relation<PeriodoNomina>;

  @Column()
  empleadoId: number;

  @ManyToOne(() => Empleado, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'empleado_id' })
  empleado: Relation<Empleado>;

  @Column({ type: 'date' })
  fechaEmision: string;

  @Column({ ...moneyColumn, default: 0 })
  totalPercepciones: number;

  @Column({ ...moneyColumn, default: 0 })
  totalDeducciones: number;

  @Column({ ...moneyColumn, default: 0 })
  liquidoRecibir: number;

  @Column({ type: 'enum', enum: EstadoNomina, default: EstadoNomina.GENERADA })
  estado: EstadoNomina;

  /** Cómo se entrega el pago: en efectivo o por depósito bancario. */
  @Column({ type: 'enum', enum: MetodoPago, default: MetodoPago.EFECTIVO })
  metodoPago: MetodoPago;

  /** Banco y cuenta usados en este pago (copia: no cambia si el empleado cambia de banco después). */
  @Column({ type: 'varchar', length: 100, nullable: true })
  bancoDestino: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  numeroCuenta: string | null;

  @OneToMany(() => NominaDetalle, (detalle) => detalle.nomina, { cascade: true })
  detalles: Relation<NominaDetalle[]>;

  // ───── Anulación (solo se llenan si el registro fue anulado) ─────

  @Column({ type: 'text', nullable: true })
  motivoAnulacion: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  fechaAnulacion: Date | null;

  @Column({ type: 'int', nullable: true })
  anuladoPorId: number | null;

  /** Usuario que anuló la boleta. */
  @ManyToOne(() => Usuario, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'anulado_por_id' })
  anuladoPor: Relation<Usuario> | null;
}
