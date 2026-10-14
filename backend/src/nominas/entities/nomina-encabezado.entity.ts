import { Column, Entity, JoinColumn, ManyToOne, OneToMany, Unique, type Relation } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';
import { EstadoNomina } from '../../common/enums.js';
import { moneyColumn } from '../../common/utils/money.js';
import { Empleado } from '../../empleados/entities/empleado.entity.js';
import { PeriodoNomina } from '../../periodos-nomina/entities/periodo-nomina.entity.js';
import { NominaDetalle } from './nomina-detalle.entity.js';

@Entity('nominas_encabezado')
@Unique('uq_nomina_periodo_empleado', ['periodoId', 'empleadoId'])
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

  @OneToMany(() => NominaDetalle, (detalle) => detalle.nomina, { cascade: true })
  detalles: Relation<NominaDetalle[]>;
}
