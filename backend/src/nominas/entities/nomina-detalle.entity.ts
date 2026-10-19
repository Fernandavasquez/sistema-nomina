import { Check, Column, Entity, Index, JoinColumn, ManyToOne, type Relation } from 'typeorm';
import { Adelanto } from '../../adelantos/entities/adelanto.entity.js';
import { BaseEntity } from '../../common/entities/base.entity.js';
import { moneyColumn } from '../../common/utils/money.js';
import { ConceptoNomina } from '../../conceptos-nomina/entities/concepto-nomina.entity.js';
import { Prestamo } from '../../prestamos/entities/prestamo.entity.js';
import { NominaEncabezado } from './nomina-encabezado.entity.js';

@Entity('nominas_detalle')
// Reglas CHECK de la base de datos (creadas en la migración inicial).
@Check('chk_detalle_monto', '"monto" >= 0')
export class NominaDetalle extends BaseEntity {
  @Index()
  @Column()
  nominaId: number;

  @ManyToOne(() => NominaEncabezado, (nomina) => nomina.detalles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'nomina_id' })
  nomina: Relation<NominaEncabezado>;

  @Column()
  conceptoId: number;

  @ManyToOne(() => ConceptoNomina, { eager: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'concepto_id' })
  concepto: Relation<ConceptoNomina>;

  @Column(moneyColumn)
  monto: number;

  /** Préstamo al que se abona (solo para el concepto PRESTAMO). */
  @Index()
  @Column({ type: 'int', nullable: true })
  prestamoId: number | null;

  @ManyToOne(() => Prestamo, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'prestamo_id' })
  prestamo: Relation<Prestamo> | null;

  /** Adelanto que se descuenta (solo para el concepto ADELANTO). */
  @Index()
  @Column({ type: 'int', nullable: true })
  adelantoId: number | null;

  @ManyToOne(() => Adelanto, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'adelanto_id' })
  adelanto: Relation<Adelanto> | null;

  @Column({ type: 'text', nullable: true })
  observacion: string | null;
}
