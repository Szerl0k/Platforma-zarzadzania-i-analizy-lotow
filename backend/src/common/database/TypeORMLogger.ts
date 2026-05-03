import { Logger, QueryRunner } from "typeorm";
import { logger } from "../utils/logger";

export class TypeORMLogger implements Logger {
  logQuery(query: string, parameters?: unknown[], _queryRunner?: QueryRunner) {
    // Only log queries to file, not to console
    const message = `Query: ${query}${parameters && parameters.length ? ` -- Parameters: ${JSON.stringify(parameters)}` : ""}`;
    this.writeToFile(message, "QUERY");
  }

  logQueryError(error: string | Error, query: string, parameters?: unknown[], _queryRunner?: QueryRunner) {
    const message = `Query Error: ${error}\nQuery: ${query}${parameters && parameters.length ? ` -- Parameters: ${JSON.stringify(parameters)}` : ""}`;
    logger.error(message);
  }

  logQuerySlow(time: number, query: string, parameters?: unknown[], _queryRunner?: QueryRunner) {
    const message = `Slow Query (${time}ms): ${query}${parameters && parameters.length ? ` -- Parameters: ${JSON.stringify(parameters)}` : ""}`;
    logger.warn(message);
  }

  logSchemaBuild(message: string, _queryRunner?: QueryRunner) {
    logger.info(`Schema Build: ${message}`, null, true);
  }

  logMigration(message: string, _queryRunner?: QueryRunner) {
    logger.info(`Migration: ${message}`, null, true);
  }

  log(level: "log" | "info" | "warn", message: unknown, _queryRunner?: QueryRunner) {
    switch (level) {
      case "log":
      case "info":
        logger.info(String(message));
        break;
      case "warn":
        logger.warn(String(message));
        break;
    }
  }

  private writeToFile(message: string, level: string) {
    // We use the internal mechanism of our logger to write to file without console output
    const timestamp = new Date().toISOString();
    const formatted = `[${timestamp}] [${level}] ${message}`;
    
    // Use writeRawLog which we just added
    logger.writeRawLog(formatted);
  }
}
