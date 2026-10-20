import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Varias empresas en el mismo sistema. Se crean las tres empresas del grupo; si ya había
 * empleados o períodos, quedan en Surtimateriales el Marfil. Los usuarios existentes reciben
 * acceso a las tres (el administrador puede restringirlo después). El DPI pasa a ser único
 * dentro de cada empresa: una misma persona puede trabajar en dos empresas.
 */

export class Multiempresa1792513286120 implements MigrationInterface {
  name = 'Multiempresa1792513286120';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."uq_periodo_frecuencia_anio_numero"`);
    await queryRunner.query(
      `CREATE TABLE "empresas" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "nombre" character varying(150) NOT NULL, "nit" character varying(20), "direccion" character varying(255), "telefono" character varying(20), "activo" boolean NOT NULL DEFAULT true, CONSTRAINT "UQ_7a75c61d17a9cba267133a6fc68" UNIQUE ("nombre"), CONSTRAINT "PK_ce7b122b37c6499bfd6520873e1" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "usuarios_empresas" ("usuario_id" integer NOT NULL, "empresa_id" integer NOT NULL, CONSTRAINT "PK_bdce039544a8477f1f1aaadf29b" PRIMARY KEY ("usuario_id", "empresa_id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_4a51d238f7720fe8a0c7387643" ON "usuarios_empresas"  ("usuario_id") `);
    await queryRunner.query(`CREATE INDEX "IDX_2438c9e2b8957cfccd917ce8af" ON "usuarios_empresas"  ("empresa_id") `);
    await queryRunner.query(
      `INSERT INTO "empresas" ("nombre") VALUES ('Surtimateriales el Marfil'), ('Transportes Andres S.A.'), ('Grupo Amher')`,
    );
    await queryRunner.query(`ALTER TABLE "empleados" ADD "empresa_id" integer`);
    await queryRunner.query(`ALTER TABLE "periodos_nomina" ADD "empresa_id" integer`);
    const marfil = `(SELECT "id" FROM "empresas" WHERE "nombre" = 'Surtimateriales el Marfil')`;
    await queryRunner.query(`UPDATE "empleados" SET "empresa_id" = ${marfil}`);
    await queryRunner.query(`UPDATE "periodos_nomina" SET "empresa_id" = ${marfil}`);
    await queryRunner.query(`ALTER TABLE "empleados" ALTER COLUMN "empresa_id" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "periodos_nomina" ALTER COLUMN "empresa_id" SET NOT NULL`);
    await queryRunner.query(
      `INSERT INTO "usuarios_empresas" ("usuario_id", "empresa_id") SELECT u."id", e."id" FROM "usuarios" u CROSS JOIN "empresas" e`,
    );
    await queryRunner.query(`ALTER TABLE "empleados" DROP CONSTRAINT "UQ_925441f13067997e47f4353a1cb"`);
    await queryRunner.query(`CREATE INDEX "IDX_925441f13067997e47f4353a1c" ON "empleados"  ("dpi") `);
    await queryRunner.query(`CREATE INDEX "IDX_bdfe43384d2c5951524d903bdc" ON "empleados"  ("empresa_id") `);
    await queryRunner.query(`CREATE UNIQUE INDEX "uq_empleado_empresa_dpi" ON "empleados"  ("empresa_id", "dpi") `);
    await queryRunner.query(`CREATE INDEX "IDX_ef355e7f2a8903dd008f12beb0" ON "periodos_nomina"  ("empresa_id") `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_periodo_empresa_frecuencia_anio_numero" ON "periodos_nomina"  ("empresa_id", "frecuencia_pago_id", "anio", "numero_periodo") WHERE "estado" <> 'ANULADO'`,
    );
    await queryRunner.query(
      `ALTER TABLE "empleados" ADD CONSTRAINT "FK_bdfe43384d2c5951524d903bdce" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "periodos_nomina" ADD CONSTRAINT "FK_ef355e7f2a8903dd008f12beb02" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "usuarios_empresas" ADD CONSTRAINT "FK_4a51d238f7720fe8a0c73876430" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "usuarios_empresas" ADD CONSTRAINT "FK_2438c9e2b8957cfccd917ce8afe" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "usuarios_empresas" DROP CONSTRAINT "FK_2438c9e2b8957cfccd917ce8afe"`);
    await queryRunner.query(`ALTER TABLE "usuarios_empresas" DROP CONSTRAINT "FK_4a51d238f7720fe8a0c73876430"`);
    await queryRunner.query(`ALTER TABLE "periodos_nomina" DROP CONSTRAINT "FK_ef355e7f2a8903dd008f12beb02"`);
    await queryRunner.query(`ALTER TABLE "empleados" DROP CONSTRAINT "FK_bdfe43384d2c5951524d903bdce"`);
    await queryRunner.query(`DROP INDEX "public"."uq_periodo_empresa_frecuencia_anio_numero"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_ef355e7f2a8903dd008f12beb0"`);
    await queryRunner.query(`DROP INDEX "public"."uq_empleado_empresa_dpi"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_bdfe43384d2c5951524d903bdc"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_925441f13067997e47f4353a1c"`);
    await queryRunner.query(`ALTER TABLE "empleados" ADD CONSTRAINT "UQ_925441f13067997e47f4353a1cb" UNIQUE ("dpi")`);
    await queryRunner.query(`ALTER TABLE "periodos_nomina" DROP COLUMN "empresa_id"`);
    await queryRunner.query(`ALTER TABLE "empleados" DROP COLUMN "empresa_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_2438c9e2b8957cfccd917ce8af"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_4a51d238f7720fe8a0c7387643"`);
    await queryRunner.query(`DROP TABLE "usuarios_empresas"`);
    await queryRunner.query(`DROP TABLE "empresas"`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_periodo_frecuencia_anio_numero" ON "periodos_nomina" USING btree ("anio", "frecuencia_pago_id", "numero_periodo") WHERE (estado <> 'ANULADO'::periodos_nomina_estado_enum)`,
    );
  }
}
