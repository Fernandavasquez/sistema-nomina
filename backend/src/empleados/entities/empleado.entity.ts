import { Column, Entity, Index, JoinColumn, ManyToOne, type Relation } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';
import { EstadoEmpleado } from '../../common/enums.js';
import { moneyColumn } from '../../common/utils/money.js';
import { TipoFrecuenciaPago } from '../../frecuencias-pago/entities/tipo-frecuencia-pago.entity.js';
import { Puesto } from '../../puestos/entities/puesto.entity.js';

@Entity('empleados')
export class Empleado extends BaseEntity {
  @Column({ type: 'varchar', length: 100 })
  nombres: string;

  @Column({ type: 'varchar', length: 100 })
  apellidos: string;

  /** Documento Personal de Identificación (13 dígitos). */
  @Column({ type: 'varchar', length: 13, unique: true })
  dpi: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  telefono: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  direccion: string | null;

  @Column({ type: 'date' })
  fechaIngreso: string;

  @Index()
  @Column({ type: 'enum', enum: EstadoEmpleado, default: EstadoEmpleado.ACTIVO })
  estado: EstadoEmpleado;

  /** Salario que recibe en CADA pago (semanal o quincenal, según su frecuencia). */
  @Column(moneyColumn)
  salarioBase: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  bancoDestino: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  numeroCuenta: string | null;

  /** Nombre del archivo guardado en el servidor (se descarga con autenticación). */
  @Column({ type: 'varchar', length: 255, nullable: true })
  fotoDpi: string | null;

  @Column()
  puestoId: number;

  @ManyToOne(() => Puesto, { eager: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'puesto_id' })
  puesto: Relation<Puesto>;

  @Column()
  frecuenciaPagoId: number;

  @ManyToOne(() => TipoFrecuenciaPago, { eager: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'frecuencia_pago_id' })
  frecuenciaPago: Relation<TipoFrecuenciaPago>;
}
