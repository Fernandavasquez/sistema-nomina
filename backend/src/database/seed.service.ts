import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Empresa } from '../empresas/entities/empresa.entity.js';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import bcrypt from 'bcryptjs';
import { DataSource, EntityManager } from 'typeorm';
import { ConceptoSistema, FrecuenciaCodigo, RolNombre, TipoConcepto } from '../common/enums.js';
import { today } from '../common/utils/dates.js';
import { ConceptoNomina } from '../conceptos-nomina/entities/concepto-nomina.entity.js';
import { Empleado } from '../empleados/entities/empleado.entity.js';
import { TipoFrecuenciaPago } from '../frecuencias-pago/entities/tipo-frecuencia-pago.entity.js';
import { Puesto } from '../puestos/entities/puesto.entity.js';
import { Rol } from '../roles/entities/rol.entity.js';
import { Usuario } from '../usuarios/entities/usuario.entity.js';

/**
 * Crea los datos mínimos para que el sistema funcione (idempotente: se puede ejecutar
 * en cada arranque sin duplicar nada):
 *  - Roles ADMIN y OPERADOR
 *  - Frecuencias SEMANAL (7) y QUINCENAL (15)
 *  - Conceptos de nómina base
 *  - Usuario administrador inicial (si no existe ningún usuario)
 *  - Datos de demostración opcionales (SEED_DEMO=true)
 */
@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectDataSource() private readonly db: DataSource,
    private readonly config: ConfigService,
  ) {}

  async onApplicationBootstrap() {
    await this.db.transaction(async (m) => {
      await this.roles(m);
      await this.frecuencias(m);
      await this.conceptos(m);
      await this.adminInicial(m);
      if (this.config.get('SEED_DEMO') === 'true') await this.demo(m);
    });
  }

  private async roles(m: EntityManager) {
    await m.upsert(
      Rol,
      [
        { nombre: RolNombre.ADMIN, descripcion: 'Acceso total, incluida la gestión de usuarios y el cierre de pagos' },
        { nombre: RolNombre.OPERADOR, descripcion: 'Gestiona empleados, adelantos, préstamos y procesa nóminas' },
      ],
      { conflictPaths: ['nombre'], skipUpdateIfNoValuesChanged: true },
    );
  }

  private async frecuencias(m: EntityManager) {
    await m.upsert(
      TipoFrecuenciaPago,
      [
        { codigo: FrecuenciaCodigo.SEMANAL, nombre: 'Semanal', diasPeriodo: 7 },
        { codigo: FrecuenciaCodigo.QUINCENAL, nombre: 'Quincenal', diasPeriodo: 15 },
      ],
      { conflictPaths: ['codigo'], skipUpdateIfNoValuesChanged: true },
    );
  }

  private async conceptos(m: EntityManager) {
    const sistema = [
      { codigo: ConceptoSistema.SUELDO_BASE, nombre: 'Sueldo base', tipo: TipoConcepto.PERCEPCION },
      { codigo: ConceptoSistema.ADELANTO, nombre: 'Descuento por adelanto', tipo: TipoConcepto.DEDUCCION },
      { codigo: ConceptoSistema.PRESTAMO, nombre: 'Cuota de préstamo', tipo: TipoConcepto.DEDUCCION },
      { codigo: ConceptoSistema.FALTAS, nombre: 'Descuento por faltas', tipo: TipoConcepto.DEDUCCION },
    ].map((c) => ({ ...c, esSistema: true, activo: true }));
    await m.upsert(ConceptoNomina, sistema, { conflictPaths: ['codigo'] });

    // Conceptos manuales de ejemplo: solo se crean una vez (el admin puede editarlos después).
    const manuales = [
      { codigo: 'BONO', nombre: 'Bono', tipo: TipoConcepto.PERCEPCION },
      { codigo: 'HORAS_EXTRA', nombre: 'Horas extra', tipo: TipoConcepto.PERCEPCION },
      { codigo: 'OTRO_DESCUENTO', nombre: 'Otro descuento', tipo: TipoConcepto.DEDUCCION },
    ];
    for (const c of manuales) {
      if (!(await m.existsBy(ConceptoNomina, { codigo: c.codigo }))) await m.save(m.create(ConceptoNomina, c));
    }
  }

  private async adminInicial(m: EntityManager) {
    if (await m.count(Usuario)) return;
    const rol = await m.findOneByOrFail(Rol, { nombre: RolNombre.ADMIN });
    const username = this.config.get('ADMIN_USERNAME', 'admin');
    await m.save(
      m.create(Usuario, {
        nombre: 'Administrador',
        apellido: 'Sistema',
        username,
        email: this.config.get('ADMIN_EMAIL', 'admin@empresa.com'),
        password: await bcrypt.hash(this.config.get('ADMIN_PASSWORD', 'Admin123!'), 10),
        rolId: rol.id,
      }),
    );
    this.logger.warn(`Usuario administrador inicial creado: "${username}". Cambie la contraseña al ingresar.`);
  }

  private async demo(m: EntityManager) {
    if (await m.count(Empleado)) return;
    // Reutiliza los puestos que ya existan (por ejemplo, si se vació la base pero se dejaron los catálogos).
    const puestos: Puesto[] = [];
    for (const p of [
      { nombre: 'Piloto', descripcion: 'Conduce el vehículo de reparto', recibeViaticos: true },
      { nombre: 'Ayudante', descripcion: 'Apoya al piloto en carga y descarga' },
      { nombre: 'Bodeguero', descripcion: 'Inventario y despacho de mercadería' },
      { nombre: 'Administrativo', descripcion: 'Oficina y contabilidad' },
    ]) {
      puestos.push((await m.findOneBy(Puesto, { nombre: p.nombre })) ?? (await m.save(m.create(Puesto, p))));
    }
    const semanal = await m.findOneByOrFail(TipoFrecuenciaPago, { codigo: FrecuenciaCodigo.SEMANAL });
    const quincenal = await m.findOneByOrFail(TipoFrecuenciaPago, { codigo: FrecuenciaCodigo.QUINCENAL });
    // Las empresas las crea la migración; los empleados de ejemplo se reparten entre ellas.
    const empresas = await m.find(Empresa, { order: { id: 'ASC' } });
    if (!empresas.length) empresas.push(await m.save(m.create(Empresa, { nombre: 'Empresa principal' })));
    const empresa = (i: number) => empresas[i % empresas.length].id;
    const hoy = today();
    const empleados = [
      ['Juan Carlos', 'Pérez García', '2547896541201', 0, semanal, 4333.33],
      ['Luis Fernando', 'Ramírez Cruz', '1987654321012', 1, semanal, 3900],
      ['María José', 'López Méndez', '3012456789101', 2, quincenal, 5000],
      ['Ana Lucía', 'Morales Díaz', '2654789123401', 3, quincenal, 8400],
    ] as const;
    await m.save(
      empleados.map(([nombres, apellidos, dpi, puesto, frecuencia, salario], i) =>
        m.create(Empleado, {
          empresaId: empresa(i === 0 ? 0 : i - 1),
          nombres,
          apellidos,
          dpi,
          puestoId: puestos[puesto].id,
          frecuenciaPagoId: frecuencia.id,
          salarioMensual: salario,
          fechaIngreso: `${hoy.slice(0, 4)}-01-02`,
          telefono: '5555' + dpi.slice(-4),
          direccion: 'Ciudad de Guatemala',
          bancoDestino: 'Banco Industrial',
          numeroCuenta: '00' + dpi.slice(0, 8),
        }),
      ),
    );
    this.logger.log('Datos de demostración creados (4 puestos, 4 empleados)');
  }
}
