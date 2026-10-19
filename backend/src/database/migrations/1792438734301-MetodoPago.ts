import { MigrationInterface, QueryRunner } from 'typeorm';

/** Forma de pago de cada boleta (efectivo o depósito) y copia del banco y la cuenta usados. */
export class MetodoPago1792438734301 implements MigrationInterface {
  name = 'MetodoPago1792438734301';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."nominas_encabezado_metodo_pago_enum" AS ENUM('EFECTIVO', 'DEPOSITO')`,
    );
    await queryRunner.query(
      `ALTER TABLE "nominas_encabezado" ADD "metodo_pago" "public"."nominas_encabezado_metodo_pago_enum" NOT NULL DEFAULT 'EFECTIVO'`,
    );
    await queryRunner.query(`ALTER TABLE "nominas_encabezado" ADD "banco_destino" character varying(100)`);
    await queryRunner.query(`ALTER TABLE "nominas_encabezado" ADD "numero_cuenta" character varying(30)`);
    // Boletas existentes: depósito si el empleado tiene banco y cuenta registrados; si no, quedan en efectivo.
    await queryRunner.query(`
            UPDATE "nominas_encabezado" n
            SET "metodo_pago" = 'DEPOSITO', "banco_destino" = e."banco_destino", "numero_cuenta" = e."numero_cuenta"
            FROM "empleados" e
            WHERE n."empleado_id" = e."id"
              AND COALESCE(TRIM(e."banco_destino"), '') <> ''
              AND COALESCE(TRIM(e."numero_cuenta"), '') <> ''
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "nominas_encabezado" DROP COLUMN "numero_cuenta"`);
    await queryRunner.query(`ALTER TABLE "nominas_encabezado" DROP COLUMN "banco_destino"`);
    await queryRunner.query(`ALTER TABLE "nominas_encabezado" DROP COLUMN "metodo_pago"`);
    await queryRunner.query(`DROP TYPE "public"."nominas_encabezado_metodo_pago_enum"`);
  }
}
