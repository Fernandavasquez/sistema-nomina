import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Viáticos (dinero para gastos de viaje, solo registro), puestos que pueden recibirlos y
 * licencia de conducir del empleado. Los puestos llamados "Piloto" quedan marcados.
 */

export class Viaticos1792691308755 implements MigrationInterface {
  name = 'Viaticos1792691308755';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "viaticos" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "empleado_id" integer NOT NULL, "destino" character varying(150) NOT NULL, "asunto" character varying(500) NOT NULL, "fecha_entrega" date NOT NULL, "fecha_hasta" date NOT NULL, "monto" numeric(12,2) NOT NULL, CONSTRAINT "chk_viaticos_fechas" CHECK ("fecha_hasta" >= "fecha_entrega"), CONSTRAINT "chk_viaticos_monto" CHECK ("monto" > 0), CONSTRAINT "PK_0dabda75c80cc4f05f409dec951" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_dae542c145c9a7c25c36dc9a5e" ON "viaticos"  ("empleado_id") `);
    await queryRunner.query(`CREATE INDEX "IDX_5defd235aebbeb089a0eff2426" ON "viaticos"  ("fecha_entrega") `);
    await queryRunner.query(`ALTER TABLE "puestos" ADD "recibe_viaticos" boolean NOT NULL DEFAULT false`);
    await queryRunner.query(`UPDATE "puestos" SET "recibe_viaticos" = true WHERE LOWER(TRIM("nombre")) LIKE 'piloto%'`);
    await queryRunner.query(`ALTER TABLE "empleados" ADD "licencia_conducir" character varying(255)`);
    await queryRunner.query(
      `ALTER TABLE "viaticos" ADD CONSTRAINT "FK_dae542c145c9a7c25c36dc9a5e9" FOREIGN KEY ("empleado_id") REFERENCES "empleados"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "viaticos" DROP CONSTRAINT "FK_dae542c145c9a7c25c36dc9a5e9"`);
    await queryRunner.query(`ALTER TABLE "empleados" DROP COLUMN "licencia_conducir"`);
    await queryRunner.query(`ALTER TABLE "puestos" DROP COLUMN "recibe_viaticos"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_5defd235aebbeb089a0eff2426"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_dae542c145c9a7c25c36dc9a5e"`);
    await queryRunner.query(`DROP TABLE "viaticos"`);
  }
}
