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
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { memoryStorage } from 'multer';
import { Roles } from '../common/decorators/roles.decorator.js';
import { RolNombre } from '../common/enums.js';
import { CreateEmpleadoDto, FiltroEmpleadosDto, UpdateEmpleadoDto } from './dto/empleado.dto.js';
import { EmpleadosService } from './empleados.service.js';

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

  @Post(':id/foto-dpi')
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { archivo: { type: 'string', format: 'binary' } } } })
  @UseInterceptors(FileInterceptor('archivo', { storage: memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }))
  subirFotoDpi(@Param('id', ParseIntPipe) id: number, @UploadedFile() archivo?: Express.Multer.File) {
    return this.service.guardarFotoDpi(id, archivo);
  }

  /** La foto del DPI es un dato sensible: solo se descarga con token, nunca como archivo público. */
  @Get(':id/foto-dpi')
  async verFotoDpi(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    const { ruta } = await this.service.rutaFotoDpi(id);
    res.setHeader('Cache-Control', 'private, no-store');
    res.sendFile(ruta);
  }
}
