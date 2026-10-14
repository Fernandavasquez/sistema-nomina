import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';
import { TipoConcepto } from '../../common/enums.js';

@Entity('conceptos_nomina')
export class ConceptoNomina extends BaseEntity {
  /** SUELDO_BASE, BONO, ADELANTO, PRESTAMO, ... */
  @Column({ type: 'varchar', length: 30, unique: true })
  codigo: string;

  @Column({ type: 'varchar', length: 100 })
  nombre: string;

  /** PERCEPCION suma al líquido · DEDUCCION resta. */
  @Column({ type: 'enum', enum: TipoConcepto })
  tipo: TipoConcepto;

  /** Los conceptos del sistema se calculan automáticamente y no se pueden editar ni borrar. */
  @Column({ default: false })
  esSistema: boolean;

  @Column({ default: true })
  activo: boolean;
}
