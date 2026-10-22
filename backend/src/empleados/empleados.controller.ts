import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { memoryStorage } from 'multer';
import { type Alcance, AlcanceEmpresas } from '../common/decorators/alcance.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { RolNombre } from '../common/enums.js';
import { CreateEmpleadoDto, FiltroEmpleadosDto, UpdateEmpleadoDto } from './dto/empleado.dto.js';
import { MAX_DOCUMENTO_BYTES, type TipoDocumento } from './documentos.js';
import { EmpleadosService } from './empleados.service.js';

/** Recibe el archivo en memoria (campo "archivo") con límite de tamaño. */
const SUBIR_ARCHIVO = FileInterceptor('archivo', {
  storage: memoryStorage(),
  limits: { fileSize: MAX_DOCUMENTO_BYTES },
});
const CUERPO_ARCHIVO = {
  schema: { type: 'object', properties: { archivo: { type: 'string', format: 'binary' } } },
} as const;

@ApiTags('Empleados')
@ApiBearerAuth()
@Controller('empleados')
export class EmpleadosController {
  constructor(private readonly service: EmpleadosService) {}

  @Get()
  findAll(@Query() filtro: FiltroEmpleadosDto, @AlcanceEmpresas() alcance: Alcance) {
    return this.service.findAll(filtro, alcance);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @AlcanceEmpresas() alcance: Alcance) {
    return this.service.findOne(id, alcance);
  }

  @Get(':id/estado-cuenta')
  estadoCuenta(@Param('id', ParseIntPipe) id: number, @AlcanceEmpresas() alcance: Alcance) {
    return this.service.estadoCuenta(id, alcance);
  }

  @ApiOperation({ summary: 'Descarga la ficha del empleado en PDF (datos, estado de cuenta, pagos y documentos)' })
  @Get(':id/ficha-pdf')
  async fichaPdf(@Param('id', ParseIntPipe) id: number, @AlcanceEmpresas() alcance: Alcance, @Res() res: Response) {
    const { pdf, nombreArchivo } = await this.service.fichaPdf(id, alcance);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${nombreArchivo}"`,
      'Cache-Control': 'private, no-store',
    });
    res.send(pdf);
  }

  @Post()
  create(@Body() dto: CreateEmpleadoDto, @AlcanceEmpresas() alcance: Alcance) {
    return this.service.create(dto, alcance);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateEmpleadoDto, @AlcanceEmpresas() alcance: Alcance) {
    return this.service.update(id, dto, alcance);
  }

  @Roles(RolNombre.ADMIN)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @AlcanceEmpresas() alcance: Alcance) {
    return this.service.remove(id, alcance);
  }

  // ───── Documentos (foto del DPI, recibo de luz, licencia de conducir) ─────
  // Son datos sensibles: solo se descargan con sesión, nunca como archivos públicos.

  @ApiOperation({ summary: 'Sube o reemplaza la foto del DPI (JPG, PNG, WEBP o PDF, máx. 5 MB)' })
  @Post(':id/foto-dpi')
  @ApiConsumes('multipart/form-data')
  @ApiBody(CUERPO_ARCHIVO)
  @UseInterceptors(SUBIR_ARCHIVO)
  subirFotoDpi(
    @Param('id', ParseIntPipe) id: number,
    @AlcanceEmpresas() alcance: Alcance,
    @UploadedFile() archivo?: Express.Multer.File,
  ) {
    return this.service.guardarDocumento(id, 'foto-dpi', alcance, archivo);
  }

  @Get(':id/foto-dpi')
  verFotoDpi(@Param('id', ParseIntPipe) id: number, @AlcanceEmpresas() alcance: Alcance, @Res() res: Response) {
    return this.enviarDocumento(id, 'foto-dpi', alcance, res);
  }

  @ApiOperation({ summary: 'Sube o reemplaza el recibo de luz (JPG, PNG, WEBP o PDF, máx. 5 MB)' })
  @Post(':id/recibo-luz')
  @ApiConsumes('multipart/form-data')
  @ApiBody(CUERPO_ARCHIVO)
  @UseInterceptors(SUBIR_ARCHIVO)
  subirReciboLuz(
    @Param('id', ParseIntPipe) id: number,
    @AlcanceEmpresas() alcance: Alcance,
    @UploadedFile() archivo?: Express.Multer.File,
  ) {
    return this.service.guardarDocumento(id, 'recibo-luz', alcance, archivo);
  }

  @Get(':id/recibo-luz')
  verReciboLuz(@Param('id', ParseIntPipe) id: number, @AlcanceEmpresas() alcance: Alcance, @Res() res: Response) {
    return this.enviarDocumento(id, 'recibo-luz', alcance, res);
  }

  @ApiOperation({ summary: 'Sube o reemplaza la licencia de conducir (JPG, PNG, WEBP o PDF, máx. 5 MB)' })
  @Post(':id/licencia')
  @ApiConsumes('multipart/form-data')
  @ApiBody(CUERPO_ARCHIVO)
  @UseInterceptors(SUBIR_ARCHIVO)
  subirLicencia(
    @Param('id', ParseIntPipe) id: number,
    @AlcanceEmpresas() alcance: Alcance,
    @UploadedFile() archivo?: Express.Multer.File,
  ) {
    return this.service.guardarDocumento(id, 'licencia', alcance, archivo);
  }

  @Get(':id/licencia')
  verLicencia(@Param('id', ParseIntPipe) id: number, @AlcanceEmpresas() alcance: Alcance, @Res() res: Response) {
    return this.enviarDocumento(id, 'licencia', alcance, res);
  }

  private async enviarDocumento(id: number, tipo: TipoDocumento, alcance: Alcance, res: Response) {
    const { ruta } = await this.service.rutaDocumento(id, tipo, alcance);
    res.setHeader('Cache-Control', 'private, no-store');
    res.sendFile(ruta);
  }
}
