import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Permite anular períodos y boletas ya pagados:
 * - estados ANULADO / ANULADA,
 * - columnas de auditoría (motivo, fecha y usuario que anuló),
 * - los índices únicos ignoran lo anulado, para poder rehacer el pago.
 */
export class AnulacionPagos1792428853045 implements MigrationInterface {
  // PostgreSQL no permite usar un valor nuevo de un enum ('ANULADO') en la misma transacción
  // en que se agregó; los índices de abajo lo usan, así que esta migración corre sin transacción.
  transaction = false;

  name = 'AnulacionPagos1792428853045';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "periodos_nomina" DROP CONSTRAINT "uq_periodo_frecuencia_anio_numero"`);
    await queryRunner.query(`ALTER TABLE "nominas_encabezado" DROP CONSTRAINT "uq_nomina_periodo_empleado"`);
    await queryRunner.query(`ALTER TABLE "periodos_nomina" ADD "motivo_anulacion" text`);
    await queryRunner.query(`ALTER TABLE "periodos_nomina" ADD "fecha_anulacion" TIMESTAMP WITH TIME ZONE`);
    await queryRunner.query(`ALTER TABLE "periodos_nomina" ADD "anulado_por_id" integer`);
    await queryRunner.query(`ALTER TABLE "nominas_encabezado" ADD "motivo_anulacion" text`);
    await queryRunner.query(`ALTER TABLE "nominas_encabezado" ADD "fecha_anulacion" TIMESTAMP WITH TIME ZONE`);
    await queryRunner.query(`ALTER TABLE "nominas_encabezado" ADD "anulado_por_id" integer`);
    await queryRunner.query(`ALTER TYPE "public"."periodos_nomina_estado_enum" ADD VALUE IF NOT EXISTS 'ANULADO'`);
    await queryRunner.query(`ALTER TYPE "public"."nominas_encabezado_estado_enum" ADD VALUE IF NOT EXISTS 'ANULADA'`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_periodo_frecuencia_anio_numero" ON "periodos_nomina"  ("frecuencia_pago_id", "anio", "numero_periodo") WHERE "estado" <> 'ANULADO'`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_nomina_periodo_empleado" ON "nominas_encabezado"  ("periodo_id", "empleado_id") WHERE "estado" <> 'ANULADA'`,
    );
    await queryRunner.query(
      `ALTER TABLE "periodos_nomina" ADD CONSTRAINT "FK_b81d19ad89c2e20bd7bb57fdff8" FOREIGN KEY ("anulado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "nominas_encabezado" ADD CONSTRAINT "FK_34f519e6c4d83ae1b017d092976" FOREIGN KEY ("anulado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "nominas_encabezado" DROP CONSTRAINT "FK_34f519e6c4d83ae1b017d092976"`);
    await queryRunner.query(`ALTER TABLE "periodos_nomina" DROP CONSTRAINT "FK_b81d19ad89c2e20bd7bb57fdff8"`);
    await queryRunner.query(`DROP INDEX "public"."uq_nomina_periodo_empleado"`);
    await queryRunner.query(`DROP INDEX "public"."uq_periodo_frecuencia_anio_numero"`);
    await queryRunner.query(`CREATE TYPE "public"."nominas_encabezado_estado_enum_old" AS ENUM('GENERADA', 'PAGADA')`);
    await queryRunner.query(
      `ALTER TABLE "nominas_encabezado" ALTER COLUMN "estado" TYPE "public"."nominas_encabezado_estado_enum_old" USING "estado"::"text"::"public"."nominas_encabezado_estado_enum_old"`,
    );
    await queryRunner.query(`DROP TYPE "public"."nominas_encabezado_estado_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."nominas_encabezado_estado_enum_old" RENAME TO "nominas_encabezado_estado_enum"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."periodos_nomina_estado_enum_old" AS ENUM('ABIERTO', 'PROCESADO', 'CERRADO')`,
    );
    await queryRunner.query(
      `ALTER TABLE "periodos_nomina" ALTER COLUMN "estado" TYPE "public"."periodos_nomina_estado_enum_old" USING "estado"::"text"::"public"."periodos_nomina_estado_enum_old"`,
    );
    await queryRunner.query(`DROP TYPE "public"."periodos_nomina_estado_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."periodos_nomina_estado_enum_old" RENAME TO "periodos_nomina_estado_enum"`,
    );
    await queryRunner.query(`ALTER TABLE "nominas_encabezado" DROP COLUMN "anulado_por_id"`);
    await queryRunner.query(`ALTER TABLE "nominas_encabezado" DROP COLUMN "fecha_anulacion"`);
    await queryRunner.query(`ALTER TABLE "nominas_encabezado" DROP COLUMN "motivo_anulacion"`);
    await queryRunner.query(`ALTER TABLE "periodos_nomina" DROP COLUMN "anulado_por_id"`);
    await queryRunner.query(`ALTER TABLE "periodos_nomina" DROP COLUMN "fecha_anulacion"`);
    await queryRunner.query(`ALTER TABLE "periodos_nomina" DROP COLUMN "motivo_anulacion"`);
    await queryRunner.query(
      `ALTER TABLE "nominas_encabezado" ADD CONSTRAINT "uq_nomina_periodo_empleado" UNIQUE ("empleado_id", "periodo_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "periodos_nomina" ADD CONSTRAINT "uq_periodo_frecuencia_anio_numero" UNIQUE ("anio", "frecuencia_pago_id", "numero_periodo")`,
    );
  }
}
