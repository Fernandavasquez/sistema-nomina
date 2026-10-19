import { Check, Column, Entity, Index, JoinColumn, ManyToOne, type Relation } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';
import { EstadoPeriodo } from '../../common/enums.js';
import { TipoFrecuenciaPago } from '../../frecuencias-pago/entities/tipo-frecuencia-pago.entity.js';
import { Usuario } from '../../usuarios/entities/usuario.entity.js';

@Entity('periodos_nomina')
// Reglas CHECK de la base de datos (creadas en la migración inicial).
@Check('chk_periodos_fechas', '"fecha_fin" >= "fecha_inicio"')
// Número único por frecuencia y año, sin contar los anulados (así se puede rehacer un período anulado).
@Index('uq_periodo_frecuencia_anio_numero', ['frecuenciaPagoId', 'anio', 'numeroPeriodo'], {
  unique: true,
  where: `"estado" <> 'ANULADO'`,
})
export class PeriodoNomina extends BaseEntity {
  @Column()
  frecuenciaPagoId: number;

  @ManyToOne(() => TipoFrecuenciaPago, { eager: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'frecuencia_pago_id' })
  frecuenciaPago: Relation<TipoFrecuenciaPago>;

  @Column({ type: 'int' })
  anio: number;

  /** Correlativo dentro del año para esa frecuencia (semana 1, 2... / quincena 1, 2...). */
  @Column({ type: 'int' })
  numeroPeriodo: number;

  @Column({ type: 'date' })
  fechaInicio: string;

  @Column({ type: 'date' })
  fechaFin: string;

  @Column({ type: 'date' })
  fechaPago: string;

  @Index()
  @Column({ type: 'enum', enum: EstadoPeriodo, default: EstadoPeriodo.ABIERTO })
  estado: EstadoPeriodo;

  // ───── Anulación (solo se llenan si el registro fue anulado) ─────

  @Column({ type: 'text', nullable: true })
  motivoAnulacion: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  fechaAnulacion: Date | null;

  @Column({ type: 'int', nullable: true })
  anuladoPorId: number | null;

  /** Usuario que anuló el período. */
  @ManyToOne(() => Usuario, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'anulado_por_id' })
  anuladoPor: Relation<Usuario> | null;
}
