import { MigrationInterface, QueryRunner } from 'typeorm';

export class ReciboLuz1792448623512 implements MigrationInterface {
  name = 'ReciboLuz1792448623512';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "empleados" ADD "recibo_luz" character varying(255)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "empleados" DROP COLUMN "recibo_luz"`);
  }
}
