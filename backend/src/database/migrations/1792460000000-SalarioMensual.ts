import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Salario MENSUAL del empleado y días/faltas en cada boleta.
 * Los salarios guardados "por pago" se convierten a mensual con la misma regla con que
 * ahora se calcula el pago, así nadie cobra distinto: semanal × 52 ÷ 12 · quincenal × 2.
 */
export class SalarioMensual1792460000000 implements MigrationInterface {
  name = 'SalarioMensual1792460000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "empleados" RENAME COLUMN "salario_base" TO "salario_mensual"`);
    await queryRunner.query(`
      UPDATE "empleados" e SET "salario_mensual" = ROUND(
        CASE f."codigo"
          WHEN 'SEMANAL' THEN e."salario_mensual" * 52 / 12
          WHEN 'QUINCENAL' THEN e."salario_mensual" * 2
          ELSE e."salario_mensual" * 30 / f."dias_periodo"
        END, 2)
      FROM "tipos_frecuencia_pago" f
      WHERE f."id" = e."frecuencia_pago_id"`);

    await queryRunner.query(`ALTER TABLE "nominas_encabezado" ADD "salario_mensual" numeric(12,2)`);
    await queryRunner.query(`ALTER TABLE "nominas_encabezado" ADD "dias_laborados" integer`);
    await queryRunner.query(`ALTER TABLE "nominas_encabezado" ADD "dias_falta" integer NOT NULL DEFAULT 0`);
    await queryRunner.query(
      `ALTER TABLE "nominas_encabezado" ADD CONSTRAINT "chk_nomina_dias_falta" CHECK ("dias_falta" >= 0 AND ("dias_laborados" IS NULL OR "dias_falta" <= "dias_laborados"))`,
    );
    // Boletas en revisión: se completa la base del cálculo para poder anotarles faltas sin reprocesar.
    await queryRunner.query(`
      UPDATE "nominas_encabezado" n SET
        "salario_mensual" = e."salario_mensual",
        "dias_laborados" = p."fecha_fin" - GREATEST(p."fecha_inicio", e."fecha_ingreso") + 1
      FROM "empleados" e, "periodos_nomina" p
      WHERE e."id" = n."empleado_id" AND p."id" = n."periodo_id" AND n."estado" = 'GENERADA'`);

    await queryRunner.query(`
      INSERT INTO "conceptos_nomina" ("codigo", "nombre", "tipo", "es_sistema", "activo")
      VALUES ('FALTAS', 'Descuento por faltas', 'DEDUCCION', true, true)
      ON CONFLICT ("codigo") DO NOTHING`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "nominas_detalle" d USING "conceptos_nomina" c
      WHERE c."id" = d."concepto_id" AND c."codigo" = 'FALTAS'`);
    await queryRunner.query(`DELETE FROM "conceptos_nomina" WHERE "codigo" = 'FALTAS'`);
    await queryRunner.query(`ALTER TABLE "nominas_encabezado" DROP CONSTRAINT "chk_nomina_dias_falta"`);
    await queryRunner.query(`ALTER TABLE "nominas_encabezado" DROP COLUMN "dias_falta"`);
    await queryRunner.query(`ALTER TABLE "nominas_encabezado" DROP COLUMN "dias_laborados"`);
    await queryRunner.query(`ALTER TABLE "nominas_encabezado" DROP COLUMN "salario_mensual"`);
    await queryRunner.query(`
      UPDATE "empleados" e SET "salario_mensual" = ROUND(
        CASE f."codigo"
          WHEN 'SEMANAL' THEN e."salario_mensual" * 12 / 52
          WHEN 'QUINCENAL' THEN e."salario_mensual" / 2
          ELSE e."salario_mensual" * f."dias_periodo" / 30
        END, 2)
      FROM "tipos_frecuencia_pago" f
      WHERE f."id" = e."frecuencia_pago_id"`);
    await queryRunner.query(`ALTER TABLE "empleados" RENAME COLUMN "salario_mensual" TO "salario_base"`);
  }
}
