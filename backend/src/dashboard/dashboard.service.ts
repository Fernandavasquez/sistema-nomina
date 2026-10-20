import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, In } from 'typeorm';
import { Adelanto } from '../adelantos/entities/adelanto.entity.js';
import type { Alcance } from '../common/decorators/alcance.decorator.js';
import { EstadoEmpleado, EstadoPeriodo, EstadoPrestamo } from '../common/enums.js';
import { round2 } from '../common/utils/money.js';
import { Empleado } from '../empleados/entities/empleado.entity.js';
import { PeriodoNomina } from '../periodos-nomina/entities/periodo-nomina.entity.js';
import { Prestamo } from '../prestamos/entities/prestamo.entity.js';

@Injectable()
export class DashboardService {
  constructor(@InjectDataSource() private readonly db: DataSource) {}

  async resumen(alcance: Alcance) {
    const empresas = alcance.ids;
    const [empleadosPorFrecuencia, adelantos, prestamos, periodosPendientes, ultimosCerrados, porEmpresa] =
      await Promise.all([
        this.db
          .getRepository(Empleado)
          .createQueryBuilder('e')
          .innerJoin('e.frecuenciaPago', 'f')
          .select('f.nombre', 'frecuencia')
          .addSelect('COUNT(*)::int', 'empleados')
          .addSelect('SUM(e.salarioMensual)', 'totalMensual')
          // Pago fijo de cada frecuencia: quincena = mensual ÷ 2 · semana = mensual × 12 ÷ 52.
          .addSelect(
            "SUM(CASE f.codigo WHEN 'QUINCENAL' THEN e.salarioMensual / 2 WHEN 'SEMANAL' THEN e.salarioMensual * 12 / 52 ELSE e.salarioMensual * f.diasPeriodo / 30 END)",
            'totalSalarios',
          )
          .where('e.estado = :estado', { estado: EstadoEmpleado.ACTIVO })
          .andWhere('e.empresaId IN (:...empresas)', { empresas })
          .groupBy('f.nombre')
          .getRawMany<{ frecuencia: string; empleados: number; totalSalarios: string; totalMensual: string }>(),
        this.db
          .getRepository(Adelanto)
          .createQueryBuilder('a')
          .innerJoin('a.empleado', 'e')
          .select('COUNT(*)::int', 'cantidad')
          .addSelect('COALESCE(SUM(a.monto), 0)', 'total')
          .where('a.aplicado = false')
          .andWhere('e.empresaId IN (:...empresas)', { empresas })
          .getRawOne<{ cantidad: number; total: string }>(),
        this.db
          .getRepository(Prestamo)
          .createQueryBuilder('p')
          .innerJoin('p.empleado', 'e')
          .select('COUNT(*)::int', 'cantidad')
          .addSelect('COALESCE(SUM(p.saldoPendiente), 0)', 'saldo')
          .where('p.estado = :estado', { estado: EstadoPrestamo.ACTIVO })
          .andWhere('e.empresaId IN (:...empresas)', { empresas })
          .getRawOne<{ cantidad: number; saldo: string }>(),
        this.db.getRepository(PeriodoNomina).find({
          where: { estado: In([EstadoPeriodo.ABIERTO, EstadoPeriodo.PROCESADO]), empresaId: In(empresas) },
          order: { fechaPago: 'ASC' },
        }),
        this.db
          .getRepository(PeriodoNomina)
          .createQueryBuilder('p')
          .innerJoin('p.frecuenciaPago', 'f')
          .leftJoin('nominas_encabezado', 'n', "n.periodo_id = p.id AND n.estado = 'PAGADA'")
          .select(['p.id AS id', 'p.anio AS anio', 'p.numeroPeriodo AS "numeroPeriodo"', 'p.fechaPago AS "fechaPago"'])
          .innerJoin('p.empresa', 'em')
          .addSelect('f.nombre', 'frecuencia')
          .addSelect('em.nombre', 'empresa')
          .addSelect('COUNT(n.id)::int', 'empleados')
          .addSelect('COALESCE(SUM(n.liquidoRecibir), 0)', 'totalPagado')
          .where('p.estado = :estado', { estado: EstadoPeriodo.CERRADO })
          .andWhere('p.empresaId IN (:...empresas)', { empresas })
          .groupBy('p.id')
          .addGroupBy('f.nombre')
          .addGroupBy('em.nombre')
          .orderBy('p.fechaPago', 'DESC')
          .limit(6)
          .getRawMany<{ totalPagado: string }>(),
        // Resumen por empresa (empleados activos y planilla por período), útil al ver "Todas las empresas".
        this.db
          .getRepository(Empleado)
          .createQueryBuilder('e')
          .innerJoin('e.empresa', 'em')
          .innerJoin('e.frecuenciaPago', 'f')
          .select('em.id', 'empresaId')
          .addSelect('em.nombre', 'nombre')
          .addSelect('COUNT(*)::int', 'empleados')
          .addSelect('SUM(e.salarioMensual)', 'totalMensual')
          .addSelect(
            `SUM(CASE f.codigo WHEN 'QUINCENAL' THEN e.salarioMensual / 2 WHEN 'SEMANAL' THEN e.salarioMensual * 12 / 52 ELSE e.salarioMensual * f.diasPeriodo / 30 END)`,
            'totalPorPeriodo',
          )
          .where('e.estado = :estado', { estado: EstadoEmpleado.ACTIVO })
          .andWhere('e.empresaId IN (:...empresas)', { empresas })
          .groupBy('em.id')
          .addGroupBy('em.nombre')
          .orderBy('em.nombre')
          .getRawMany<{
            empresaId: number;
            nombre: string;
            empleados: number;
            totalMensual: string;
            totalPorPeriodo: string;
          }>(),
      ]);

    return {
      empleadosActivos: empleadosPorFrecuencia.reduce((s, f) => s + f.empleados, 0),
      empleadosPorFrecuencia: empleadosPorFrecuencia.map((f) => ({
        ...f,
        totalSalarios: round2(Number(f.totalSalarios)),
        totalMensual: round2(Number(f.totalMensual)),
      })),
      adelantosPendientes: { cantidad: adelantos?.cantidad ?? 0, total: round2(Number(adelantos?.total ?? 0)) },
      prestamosActivos: { cantidad: prestamos?.cantidad ?? 0, saldo: round2(Number(prestamos?.saldo ?? 0)) },
      periodosPendientes,
      ultimosPagos: ultimosCerrados.map((p) => ({ ...p, totalPagado: round2(Number(p.totalPagado)) })),
      porEmpresa: porEmpresa.map((e) => ({
        ...e,
        totalMensual: round2(Number(e.totalMensual)),
        totalPorPeriodo: round2(Number(e.totalPorPeriodo)),
      })),
    };
  }
}
