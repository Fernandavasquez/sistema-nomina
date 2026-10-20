import { Column, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, type Relation } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';
import { Empresa } from '../../empresas/entities/empresa.entity.js';
import { Rol } from '../../roles/entities/rol.entity.js';

@Entity('usuarios')
export class Usuario extends BaseEntity {
  @Column({ type: 'varchar', length: 100 })
  nombre: string;

  @Column({ type: 'varchar', length: 100 })
  apellido: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  username: string;

  @Column({ type: 'varchar', length: 150, unique: true })
  email: string;

  /** Hash bcrypt. `select: false` evita que se devuelva en las consultas por defecto. */
  @Column({ select: false })
  password: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  ultimoAcceso: Date | null;

  @Column()
  rolId: number;

  @ManyToOne(() => Rol, { eager: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'rol_id' })
  rol: Relation<Rol>;

  /** Empresas que puede ver y trabajar. El administrador ve todas, sin importar esta lista. */
  @ManyToMany(() => Empresa)
  @JoinTable({
    name: 'usuarios_empresas',
    joinColumn: { name: 'usuario_id' },
    inverseJoinColumn: { name: 'empresa_id' },
  })
  empresas: Relation<Empresa[]>;
}
