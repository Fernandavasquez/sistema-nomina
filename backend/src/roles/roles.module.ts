import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Rol } from './entities/rol.entity.js';
import { RolesController } from './roles.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Rol])],
  controllers: [RolesController],
})
export class RolesModule {}
