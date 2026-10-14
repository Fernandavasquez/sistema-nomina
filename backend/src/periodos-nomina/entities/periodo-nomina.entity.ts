import { Column, Entity, Index, JoinColumn, ManyToOne, Unique, type Relation } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';
import { EstadoPeriodo } from '../../common/enums.js';
import { TipoFrecuenciaPago } from '../../frecuencias-pago/entities/tipo-frecuencia-pago.entity.js';

@Entity('periodos_nomina')
@Unique('uq_periodo_frecuencia_anio_numero', ['frecuenciaPagoId', 'anio', 'numeroPeriodo'])
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
}
