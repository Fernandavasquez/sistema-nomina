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
  findAll(@Query() filtro: FiltroEmpleadosDto) {
    return this.service.findAll(filtro);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Get(':id/estado-cuenta')
  estadoCuenta(@Param('id', ParseIntPipe) id: number) {
    return this.service.estadoCuenta(id);
  }

  @Post()
  create(@Body() dto: CreateEmpleadoDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateEmpleadoDto) {
    return this.service.update(id, dto);
  }

  @Roles(RolNombre.ADMIN)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }

  // ───── Documentos (foto del DPI, recibo de luz) ─────
  // Son datos sensibles: solo se descargan con sesión, nunca como archivos públicos.

  @ApiOperation({ summary: 'Sube o reemplaza la foto del DPI (JPG, PNG, WEBP o PDF, máx. 5 MB)' })
  @Post(':id/foto-dpi')
  @ApiConsumes('multipart/form-data')
  @ApiBody(CUERPO_ARCHIVO)
  @UseInterceptors(SUBIR_ARCHIVO)
  subirFotoDpi(@Param('id', ParseIntPipe) id: number, @UploadedFile() archivo?: Express.Multer.File) {
    return this.service.guardarDocumento(id, 'foto-dpi', archivo);
  }

  @Get(':id/foto-dpi')
  verFotoDpi(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    return this.enviarDocumento(id, 'foto-dpi', res);
  }

  @ApiOperation({ summary: 'Sube o reemplaza el recibo de luz (JPG, PNG, WEBP o PDF, máx. 5 MB)' })
  @Post(':id/recibo-luz')
  @ApiConsumes('multipart/form-data')
  @ApiBody(CUERPO_ARCHIVO)
  @UseInterceptors(SUBIR_ARCHIVO)
  subirReciboLuz(@Param('id', ParseIntPipe) id: number, @UploadedFile() archivo?: Express.Multer.File) {
    return this.service.guardarDocumento(id, 'recibo-luz', archivo);
  }

  @Get(':id/recibo-luz')
  verReciboLuz(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    return this.enviarDocumento(id, 'recibo-luz', res);
  }

  private async enviarDocumento(id: number, tipo: TipoDocumento, res: Response) {
    const { ruta } = await this.service.rutaDocumento(id, tipo);
    res.setHeader('Cache-Control', 'private, no-store');
    res.sendFile(ruta);
  }
}
