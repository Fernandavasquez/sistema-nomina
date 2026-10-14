import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository, SelectQueryBuilder } from 'typeorm';
import { Adelanto } from '../adelantos/entities/adelanto.entity.js';
import { EstadoPrestamo } from '../common/enums.js';
import { round2 } from '../common/utils/money.js';
import { TipoFrecuenciaPago } from '../frecuencias-pago/entities/tipo-frecuencia-pago.entity.js';
import { NominaEncabezado } from '../nominas/entities/nomina-encabezado.entity.js';
import { Prestamo } from '../prestamos/entities/prestamo.entity.js';
import { Puesto } from '../puestos/entities/puesto.entity.js';
import { CreateEmpleadoDto, FiltroEmpleadosDto, UpdateEmpleadoDto } from './dto/empleado.dto.js';
import { Empleado } from './entities/empleado.entity.js';

const TIPOS_FOTO: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
};
const MAX_FOTO_BYTES = 5 * 1024 * 1024;

/** "Pérez Muñoz" → "Perez Munoz" */
function quitarTildes(texto: string): string {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/** Evita que % o _ escritos por el usuario actúen como comodines de LIKE. */
function escaparLike(texto: string): string {
  return texto.replace(/[\\%_]/g, (c) => `\\${c}`);
}

@Injectable()
export class EmpleadosService {
  private readonly dirFotos: string;

  constructor(
    @InjectRepository(Empleado) private readonly empleados: Repository<Empleado>,
    @InjectRepository(Puesto) private readonly puestos: Repository<Puesto>,
    @InjectRepository(TipoFrecuenciaPago) private readonly frecuencias: Repository<TipoFrecuenciaPago>,
    @InjectRepository(Adelanto) private readonly adelantos: Repository<Adelanto>,
    @InjectRepository(Prestamo) private readonly prestamos: Repository<Prestamo>,
    @InjectRepository(NominaEncabezado) private readonly nominas: Repository<NominaEncabezado>,
    config: ConfigService,
  ) {
    this.dirFotos = resolve(config.get('UPLOAD_DIR', 'uploads'), 'dpi');
  }

  findAll(filtro: FiltroEmpleadosDto) {
    const qb = this.empleados
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.puesto', 'puesto')
      .leftJoinAndSelect('e.frecuenciaPago', 'frecuenciaPago')
      .orderBy('e.apellidos', 'ASC')
      .addOrderBy('e.nombres', 'ASC');

    if (filtro.buscar?.trim()) this.filtrarPorTexto(qb, filtro.buscar);
    if (filtro.estado) qb.andWhere('e.estado = :estado', { estado: filtro.estado });
    if (filtro.puestoId) qb.andWhere('e.puestoId = :puestoId', { puestoId: filtro.puestoId });
    if (filtro.frecuenciaPagoId) {
      qb.andWhere('e.frecuenciaPagoId = :frecuenciaPagoId', { frecuenciaPagoId: filtro.frecuenciaPagoId });
    }
    return qb.getMany();
  }

  /**
   * Búsqueda flexible por nombre o DPI:
   * - sin importar mayúsculas ni tildes ("perez" encuentra "Pérez"),
   * - varias palabras en cualquier orden ("garcia juan" encuentra "Juan Carlos Pérez García"),
   * - DPI con o sin espacios ("2547 89654" encuentra "2547896541201").
   */
  private filtrarPorTexto(qb: SelectQueryBuilder<Empleado>, buscar: string) {
    const terminos = quitarTildes(buscar.toLowerCase()).split(/\s+/).filter(Boolean);
    const digitos = buscar.replace(/[\s-]/g, '');
    const nombreSql = "translate(LOWER(e.nombres || ' ' || e.apellidos), 'áéíóúüñ', 'aeiouun')";

    qb.andWhere(
      new Brackets((w) => {
        w.where(
          new Brackets((nombre) => {
            terminos.forEach((t, i) =>
              nombre.andWhere(`${nombreSql} LIKE :t${i}`, { [`t${i}`]: `%${escaparLike(t)}%` }),
            );
          }),
        );
        if (/^\d+$/.test(digitos)) w.orWhere('e.dpi LIKE :dpi', { dpi: `%${digitos}%` });
      }),
    );
  }

  async findOne(id: number) {
    const empleado = await this.empleados.findOne({ where: { id } });
    if (!empleado) throw new NotFoundException(`Empleado ${id} no encontrado`);
    return empleado;
  }

  async create(dto: CreateEmpleadoDto) {
    await this.validarReferencias(dto.puestoId, dto.frecuenciaPagoId);
    await this.assertDpiUnico(dto.dpi);
    const { id } = await this.empleados.save(this.empleados.create(dto));
    return this.findOne(id);
  }

  async update(id: number, dto: UpdateEmpleadoDto) {
    const empleado = await this.findOne(id);
    await this.validarReferencias(dto.puestoId, dto.frecuenciaPagoId);
    if (dto.dpi) await this.assertDpiUnico(dto.dpi, id);

    // Se actualiza con los ids (no con las relaciones cargadas) para que el cambio de puesto/frecuencia se guarde.
    if (Object.keys(dto).length) await this.empleados.update(id, { ...dto });
    return this.findOne(empleado.id);
  }

  async remove(id: number) {
    const empleado = await this.findOne(id);
    const [tieneNominas, tieneAdelantos, tienePrestamos] = await Promise.all([
      this.nominas.existsBy({ empleadoId: id }),
      this.adelantos.existsBy({ empleadoId: id }),
      this.prestamos.existsBy({ empleadoId: id }),
    ]);
    if (tieneNominas || tieneAdelantos || tienePrestamos) {
      throw new ConflictException(
        'El empleado tiene historial (nóminas, adelantos o préstamos). Cambie su estado a INACTIVO en lugar de eliminarlo.',
      );
    }
    await this.empleados.remove(empleado);
    if (empleado.fotoDpi) await unlink(join(this.dirFotos, empleado.fotoDpi)).catch(() => undefined);
    return { message: 'Empleado eliminado' };
  }

  /** Resumen financiero del empleado: lo que debe y lo último que se le pagó. */
  async estadoCuenta(id: number) {
    const empleado = await this.findOne(id);
    const [adelantosPendientes, prestamosActivos, ultimasNominas] = await Promise.all([
      this.adelantos.find({ where: { empleadoId: id, aplicado: false }, order: { fechaSolicitud: 'ASC' } }),
      this.prestamos.find({
        where: { empleadoId: id, estado: EstadoPrestamo.ACTIVO },
        order: { fechaSolicitud: 'ASC' },
      }),
      this.nominas.find({
        where: { empleadoId: id },
        relations: { periodo: true },
        order: { periodo: { fechaInicio: 'DESC' } },
        take: 10,
      }),
    ]);

    return {
      empleado,
      totalAdelantosPendientes: round2(adelantosPendientes.reduce((s, a) => s + a.monto, 0)),
      totalSaldoPrestamos: round2(prestamosActivos.reduce((s, p) => s + p.saldoPendiente, 0)),
      adelantosPendientes,
      prestamosActivos,
      ultimasNominas,
    };
  }

  async guardarFotoDpi(id: number, archivo?: Express.Multer.File) {
    const empleado = await this.findOne(id);
    if (!archivo) throw new BadRequestException('Debe enviar un archivo en el campo "archivo"');
    const extension = TIPOS_FOTO[archivo.mimetype];
    if (!extension) throw new BadRequestException('Formato no permitido. Use JPG, PNG, WEBP o PDF');
    if (archivo.size > MAX_FOTO_BYTES) throw new BadRequestException('El archivo no debe superar 5 MB');

    await mkdir(this.dirFotos, { recursive: true });
    // Nombre aleatorio: nunca se usa el nombre original (evita sobrescrituras y rutas maliciosas).
    const nombre = `${id}-${randomUUID()}${extension}`;
    await writeFile(join(this.dirFotos, nombre), archivo.buffer);

    if (empleado.fotoDpi) await unlink(join(this.dirFotos, empleado.fotoDpi)).catch(() => undefined);
    await this.empleados.update(id, { fotoDpi: nombre });
    return this.findOne(id);
  }

  async rutaFotoDpi(id: number) {
    const empleado = await this.findOne(id);
    if (!empleado.fotoDpi) throw new NotFoundException('El empleado no tiene foto de DPI');
    return { ruta: join(this.dirFotos, empleado.fotoDpi), extension: extname(empleado.fotoDpi) };
  }

  private async validarReferencias(puestoId?: number, frecuenciaPagoId?: number) {
    if (puestoId && !(await this.puestos.existsBy({ id: puestoId }))) {
      throw new BadRequestException(`El puesto ${puestoId} no existe`);
    }
    if (frecuenciaPagoId && !(await this.frecuencias.existsBy({ id: frecuenciaPagoId }))) {
      throw new BadRequestException(`La frecuencia de pago ${frecuenciaPagoId} no existe`);
    }
  }

  private async assertDpiUnico(dpi: string, exceptoId?: number) {
    const existente = await this.empleados.findOne({ where: { dpi } });
    if (existente && existente.id !== exceptoId) {
      throw new ConflictException(`Ya existe un empleado con el DPI ${dpi}`);
    }
  }
}
