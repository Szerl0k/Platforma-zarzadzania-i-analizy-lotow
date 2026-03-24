import path from "path";
import {AppDataSource} from "../data-source";
import * as fs from "node:fs";

async function runDatabaseSetup() : Promise<void> {
    try {
        if (!AppDataSource.isInitialized) {
            console.log('Connecting to the database.');

            AppDataSource.setOptions({logging: false});
            await AppDataSource.initialize();
            console.log('Connected to the db');
        }


        console.log('Running TypeORM migrations')
        const migrations = await AppDataSource.runMigrations();

        if (migrations.length > 0) {
            console.log(`${migrations.length} migrations ran`)
        } else {
            console.log('Database is up to date. No new migrations to rnu')
        }

        const sqlFilePath = path.join(__dirname, 'seed.sql');

        if (!fs.existsSync(sqlFilePath)) {
            throw new Error(`SQL seeding file does not exist: ${sqlFilePath}`);
        }

        console.log(`Reading SQL script: ${sqlFilePath}`);
        const sqlQuery = fs.readFileSync(sqlFilePath, 'utf-8');

        console.log('Running SQL script (seed)');


        const queryRunner = AppDataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            await queryRunner.query(sqlQuery);
            await queryRunner.commitTransaction();
            console.log('Seeding script applied successfully');

        } catch (seedError: unknown) {
            await queryRunner.rollbackTransaction();
            console.error('Critical error in applying script. Rolling back.')
            throw seedError;
        } finally {
            await queryRunner.release();
        }


    } catch (error: unknown) {
        console.error('Error during db seeding');
        console.error(error)
        process.exit(1);
    } finally {
        if (AppDataSource.isInitialized) {
            await AppDataSource.destroy();
            console.log('Database connection pool closed.')
        }
    }
}

runDatabaseSetup();