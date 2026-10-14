import { MigrationInterface, QueryRunner } from 'typeorm';

export class EsquemaInicial1791992329109 implements MigrationInterface {
  name = 'EsquemaInicial1791992329109';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "tipos_frecuencia_pago" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "codigo" character varying(20) NOT NULL, "nombre" character varying(50) NOT NULL, "dias_periodo" integer NOT NULL, CONSTRAINT "UQ_cc1f2dfc3ba9bc8a801107250cb" UNIQUE ("codigo"), CONSTRAINT "PK_5389279a8e413961a5cdbe49463" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "puestos" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "nombre" character varying(100) NOT NULL, "descripcion" character varying(255), "activo" boolean NOT NULL DEFAULT true, CONSTRAINT "UQ_f4f07dbe5a11f99527e61d1df71" UNIQUE ("nombre"), CONSTRAINT "PK_76f2abcffc72ffe8f01c46384b4" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE TYPE "public"."empleados_estado_enum" AS ENUM('ACTIVO', 'INACTIVO')`);
    await queryRunner.query(
      `CREATE TABLE "empleados" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "nombres" character varying(100) NOT NULL, "apellidos" character varying(100) NOT NULL, "dpi" character varying(13) NOT NULL, "telefono" character varying(20), "email" character varying(150), "direccion" character varying(255), "fecha_ingreso" date NOT NULL, "estado" "public"."empleados_estado_enum" NOT NULL DEFAULT 'ACTIVO', "salario_base" numeric(12,2) NOT NULL, "banco_destino" character varying(100), "numero_cuenta" character varying(30), "foto_dpi" character varying(255), "puesto_id" integer NOT NULL, "frecuencia_pago_id" integer NOT NULL, CONSTRAINT "UQ_925441f13067997e47f4353a1cb" UNIQUE ("dpi"), CONSTRAINT "PK_73a63a6fcb4266219be3eb0ce8a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_ae15bf046920bce7f26ea17a19" ON "empleados"  ("estado") `);
    await queryRunner.query(
      `CREATE TABLE "adelantos" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "empleado_id" integer NOT NULL, "monto" numeric(12,2) NOT NULL, "fecha_solicitud" date NOT NULL, "aplicado" boolean NOT NULL DEFAULT false, "observacion" text, CONSTRAINT "PK_4316ab1e3ef0fb80807174363e2" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_3dc8080dcab8993d20c290896d" ON "adelantos"  ("empleado_id") `);
    await queryRunner.query(`CREATE INDEX "IDX_98d1885bf07fe6697f99358c3b" ON "adelantos"  ("aplicado") `);
    await queryRunner.query(`CREATE TYPE "public"."conceptos_nomina_tipo_enum" AS ENUM('PERCEPCION', 'DEDUCCION')`);
    await queryRunner.query(
      `CREATE TABLE "conceptos_nomina" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "codigo" character varying(30) NOT NULL, "nombre" character varying(100) NOT NULL, "tipo" "public"."conceptos_nomina_tipo_enum" NOT NULL, "es_sistema" boolean NOT NULL DEFAULT false, "activo" boolean NOT NULL DEFAULT true, CONSTRAINT "UQ_34f00f94f62b28dcc6f187bb148" UNIQUE ("codigo"), CONSTRAINT "PK_d81a1c5a4bc79845a74b67a7921" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."periodos_nomina_estado_enum" AS ENUM('ABIERTO', 'PROCESADO', 'CERRADO')`,
    );
    await queryRunner.query(
      `CREATE TABLE "periodos_nomina" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "frecuencia_pago_id" integer NOT NULL, "anio" integer NOT NULL, "numero_periodo" integer NOT NULL, "fecha_inicio" date NOT NULL, "fecha_fin" date NOT NULL, "fecha_pago" date NOT NULL, "estado" "public"."periodos_nomina_estado_enum" NOT NULL DEFAULT 'ABIERTO', CONSTRAINT "uq_periodo_frecuencia_anio_numero" UNIQUE ("frecuencia_pago_id", "anio", "numero_periodo"), CONSTRAINT "PK_792f971c12b021b6615978c03b6" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_e79507c0291e18e1b656c75627" ON "periodos_nomina"  ("estado") `);
    await queryRunner.query(`CREATE TYPE "public"."prestamos_estado_enum" AS ENUM('ACTIVO', 'PAGADO', 'CANCELADO')`);
    await queryRunner.query(
      `CREATE TABLE "prestamos" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "empleado_id" integer NOT NULL, "monto_total" numeric(12,2) NOT NULL, "monto_cuota" numeric(12,2) NOT NULL, "saldo_pendiente" numeric(12,2) NOT NULL, "fecha_solicitud" date NOT NULL, "estado" "public"."prestamos_estado_enum" NOT NULL DEFAULT 'ACTIVO', "observacion" text, CONSTRAINT "PK_3a2a5a8ed68438a02780b16c5b4" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_02d93ce0f23d3cae93568303e7" ON "prestamos"  ("empleado_id") `);
    await queryRunner.query(`CREATE INDEX "IDX_0b0346a5d3d6b8aba29b349816" ON "prestamos"  ("estado") `);
    await queryRunner.query(
      `CREATE TABLE "nominas_detalle" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "nomina_id" integer NOT NULL, "concepto_id" integer NOT NULL, "monto" numeric(12,2) NOT NULL, "prestamo_id" integer, "adelanto_id" integer, "observacion" text, CONSTRAINT "PK_bc633bc01e95750bd11a05af2c5" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_4413fcefa1947433efe9d07aac" ON "nominas_detalle"  ("nomina_id") `);
    await queryRunner.query(`CREATE INDEX "IDX_2caac8020afbd1d2a4a86d9bc0" ON "nominas_detalle"  ("prestamo_id") `);
    await queryRunner.query(`CREATE INDEX "IDX_0950ce01fb75cd0bb9fcf7e8ff" ON "nominas_detalle"  ("adelanto_id") `);
    await queryRunner.query(`CREATE TYPE "public"."nominas_encabezado_estado_enum" AS ENUM('GENERADA', 'PAGADA')`);
    await queryRunner.query(
      `CREATE TABLE "nominas_encabezado" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "periodo_id" integer NOT NULL, "empleado_id" integer NOT NULL, "fecha_emision" date NOT NULL, "total_percepciones" numeric(12,2) NOT NULL DEFAULT '0', "total_deducciones" numeric(12,2) NOT NULL DEFAULT '0', "liquido_recibir" numeric(12,2) NOT NULL DEFAULT '0', "estado" "public"."nominas_encabezado_estado_enum" NOT NULL DEFAULT 'GENERADA', CONSTRAINT "uq_nomina_periodo_empleado" UNIQUE ("periodo_id", "empleado_id"), CONSTRAINT "PK_5082abad25b3df468381d764864" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "roles" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "nombre" character varying(50) NOT NULL, "descripcion" character varying(200), "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "UQ_a5be7aa67e759e347b1c6464e10" UNIQUE ("nombre"), CONSTRAINT "PK_c1433d71a4838793a49dcad46ab" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "usuarios" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "nombre" character varying(100) NOT NULL, "apellido" character varying(100) NOT NULL, "username" character varying(50) NOT NULL, "email" character varying(150) NOT NULL, "password" character varying NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "ultimo_acceso" TIMESTAMP WITH TIME ZONE, "rol_id" integer NOT NULL, CONSTRAINT "UQ_9f78cfde576fc28f279e2b7a9cb" UNIQUE ("username"), CONSTRAINT "UQ_446adfc18b35418aac32ae0b7b5" UNIQUE ("email"), CONSTRAINT "PK_d7281c63c176e152e4c531594a8" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "empleados" ADD CONSTRAINT "FK_f6ac67b5ce4b35feaab7987aab7" FOREIGN KEY ("puesto_id") REFERENCES "puestos"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "empleados" ADD CONSTRAINT "FK_64241e625652d9f62d4b8c1e6fc" FOREIGN KEY ("frecuencia_pago_id") REFERENCES "tipos_frecuencia_pago"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "adelantos" ADD CONSTRAINT "FK_3dc8080dcab8993d20c290896d0" FOREIGN KEY ("empleado_id") REFERENCES "empleados"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "periodos_nomina" ADD CONSTRAINT "FK_502a5a3937c7db3d7085139d982" FOREIGN KEY ("frecuencia_pago_id") REFERENCES "tipos_frecuencia_pago"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "prestamos" ADD CONSTRAINT "FK_02d93ce0f23d3cae93568303e7e" FOREIGN KEY ("empleado_id") REFERENCES "empleados"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "nominas_detalle" ADD CONSTRAINT "FK_4413fcefa1947433efe9d07aac1" FOREIGN KEY ("nomina_id") REFERENCES "nominas_encabezado"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "nominas_detalle" ADD CONSTRAINT "FK_33d2e461f4f318e37ff401fe50f" FOREIGN KEY ("concepto_id") REFERENCES "conceptos_nomina"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "nominas_detalle" ADD CONSTRAINT "FK_2caac8020afbd1d2a4a86d9bc04" FOREIGN KEY ("prestamo_id") REFERENCES "prestamos"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "nominas_detalle" ADD CONSTRAINT "FK_0950ce01fb75cd0bb9fcf7e8ff0" FOREIGN KEY ("adelanto_id") REFERENCES "adelantos"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "nominas_encabezado" ADD CONSTRAINT "FK_2a9096f274f2250d3f81fb26515" FOREIGN KEY ("periodo_id") REFERENCES "periodos_nomina"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "nominas_encabezado" ADD CONSTRAINT "FK_7a0c30a382c9e8a0b44ef6b4fa7" FOREIGN KEY ("empleado_id") REFERENCES "empleados"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "usuarios" ADD CONSTRAINT "FK_9e519760a660751f4fa21453d3e" FOREIGN KEY ("rol_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    // Reglas de integridad a nivel de base de datos (agregadas manualmente)
    await queryRunner.query(
      `ALTER TABLE "empleados" ADD CONSTRAINT "chk_empleados_salario" CHECK ("salario_base" > 0)`,
    );
    await queryRunner.query(`ALTER TABLE "empleados" ADD CONSTRAINT "chk_empleados_dpi" CHECK ("dpi" ~ '^[0-9]{13}$')`);
    await queryRunner.query(`ALTER TABLE "adelantos" ADD CONSTRAINT "chk_adelantos_monto" CHECK ("monto" > 0)`);
    await queryRunner.query(
      `ALTER TABLE "prestamos" ADD CONSTRAINT "chk_prestamos_montos" CHECK ("monto_total" > 0 AND "monto_cuota" > 0 AND "saldo_pendiente" >= 0 AND "saldo_pendiente" <= "monto_total")`,
    );
    await queryRunner.query(
      `ALTER TABLE "periodos_nomina" ADD CONSTRAINT "chk_periodos_fechas" CHECK ("fecha_fin" >= "fecha_inicio")`,
    );
    await queryRunner.query(`ALTER TABLE "nominas_detalle" ADD CONSTRAINT "chk_detalle_monto" CHECK ("monto" >= 0)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "nominas_detalle" DROP CONSTRAINT "chk_detalle_monto"`);
    await queryRunner.query(`ALTER TABLE "periodos_nomina" DROP CONSTRAINT "chk_periodos_fechas"`);
    await queryRunner.query(`ALTER TABLE "prestamos" DROP CONSTRAINT "chk_prestamos_montos"`);
    await queryRunner.query(`ALTER TABLE "adelantos" DROP CONSTRAINT "chk_adelantos_monto"`);
    await queryRunner.query(`ALTER TABLE "empleados" DROP CONSTRAINT "chk_empleados_dpi"`);
    await queryRunner.query(`ALTER TABLE "empleados" DROP CONSTRAINT "chk_empleados_salario"`);
    await queryRunner.query(`ALTER TABLE "usuarios" DROP CONSTRAINT "FK_9e519760a660751f4fa21453d3e"`);
    await queryRunner.query(`ALTER TABLE "nominas_encabezado" DROP CONSTRAINT "FK_7a0c30a382c9e8a0b44ef6b4fa7"`);
    await queryRunner.query(`ALTER TABLE "nominas_encabezado" DROP CONSTRAINT "FK_2a9096f274f2250d3f81fb26515"`);
    await queryRunner.query(`ALTER TABLE "nominas_detalle" DROP CONSTRAINT "FK_0950ce01fb75cd0bb9fcf7e8ff0"`);
    await queryRunner.query(`ALTER TABLE "nominas_detalle" DROP CONSTRAINT "FK_2caac8020afbd1d2a4a86d9bc04"`);
    await queryRunner.query(`ALTER TABLE "nominas_detalle" DROP CONSTRAINT "FK_33d2e461f4f318e37ff401fe50f"`);
    await queryRunner.query(`ALTER TABLE "nominas_detalle" DROP CONSTRAINT "FK_4413fcefa1947433efe9d07aac1"`);
    await queryRunner.query(`ALTER TABLE "prestamos" DROP CONSTRAINT "FK_02d93ce0f23d3cae93568303e7e"`);
    await queryRunner.query(`ALTER TABLE "periodos_nomina" DROP CONSTRAINT "FK_502a5a3937c7db3d7085139d982"`);
    await queryRunner.query(`ALTER TABLE "adelantos" DROP CONSTRAINT "FK_3dc8080dcab8993d20c290896d0"`);
    await queryRunner.query(`ALTER TABLE "empleados" DROP CONSTRAINT "FK_64241e625652d9f62d4b8c1e6fc"`);
    await queryRunner.query(`ALTER TABLE "empleados" DROP CONSTRAINT "FK_f6ac67b5ce4b35feaab7987aab7"`);
    await queryRunner.query(`DROP TABLE "usuarios"`);
    await queryRunner.query(`DROP TABLE "roles"`);
    await queryRunner.query(`DROP TABLE "nominas_encabezado"`);
    await queryRunner.query(`DROP TYPE "public"."nominas_encabezado_estado_enum"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_0950ce01fb75cd0bb9fcf7e8ff"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_2caac8020afbd1d2a4a86d9bc0"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_4413fcefa1947433efe9d07aac"`);
    await queryRunner.query(`DROP TABLE "nominas_detalle"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_0b0346a5d3d6b8aba29b349816"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_02d93ce0f23d3cae93568303e7"`);
    await queryRunner.query(`DROP TABLE "prestamos"`);
    await queryRunner.query(`DROP TYPE "public"."prestamos_estado_enum"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_e79507c0291e18e1b656c75627"`);
    await queryRunner.query(`DROP TABLE "periodos_nomina"`);
    await queryRunner.query(`DROP TYPE "public"."periodos_nomina_estado_enum"`);
    await queryRunner.query(`DROP TABLE "conceptos_nomina"`);
    await queryRunner.query(`DROP TYPE "public"."conceptos_nomina_tipo_enum"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_98d1885bf07fe6697f99358c3b"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_3dc8080dcab8993d20c290896d"`);
    await queryRunner.query(`DROP TABLE "adelantos"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_ae15bf046920bce7f26ea17a19"`);
    await queryRunner.query(`DROP TABLE "empleados"`);
    await queryRunner.query(`DROP TYPE "public"."empleados_estado_enum"`);
    await queryRunner.query(`DROP TABLE "puestos"`);
    await queryRunner.query(`DROP TABLE "tipos_frecuencia_pago"`);
  }
}
