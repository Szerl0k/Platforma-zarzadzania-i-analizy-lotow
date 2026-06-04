/* eslint-disable no-console */
import fs from "fs";
import path from "path";

export enum LogLevel {
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
  FATAL = "FATAL",
}

class Logger {
  private logDir: string;
  private logFile: string;

  constructor() {
    this.logDir = path.join(process.cwd(), "logs");
    this.logFile = path.join(this.logDir, "app.log");
    this.ensureLogDir();
  }

  private ensureLogDir(): void {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  private formatMessage(
    level: LogLevel,
    message: string,
    detail?: unknown,
  ): string {
    const timestamp = new Date().toISOString();
    let detailStr = "";
    if (detail) {
      if (detail instanceof Error) {
        detailStr = `\n${detail.stack || detail.message}`;
      } else {
        detailStr = `\n${JSON.stringify(detail, null, 2)}`;
      }
    }
    return `[${timestamp}] [${level}] ${message}${detailStr}`;
  }

  private writeToFile(message: string): void {
    if (process.env.NODE_ENV === "production") {
      return;
    }
    try {
      fs.appendFileSync(this.logFile, message + "\n");
    } catch (err) {
      console.error("Failed to write to log file:", err);
    }
  }

  public writeRawLog(message: string): void {
    this.writeToFile(message);
  }

  public info(message: string, detail?: unknown, logToConsole = false): void {
    const formatted = this.formatMessage(LogLevel.INFO, message, detail);
    if (logToConsole || process.env.NODE_ENV === "production") {
      console.log(formatted);
    }
    this.writeToFile(formatted);
  }

  public warn(message: string, detail?: unknown) : void {
    const formatted = this.formatMessage(LogLevel.WARN, message, detail);
    console.warn(formatted);
    this.writeToFile(formatted);
  }

  public error(message: string, detail?: unknown): void {
    const formatted = this.formatMessage(LogLevel.ERROR, message, detail);
    console.error(formatted);
    this.writeToFile(formatted);
  }

  public fatal(message: string, detail?: unknown): void {
    const formatted = this.formatMessage(LogLevel.FATAL, message, detail);
    console.error(formatted);
    this.writeToFile(formatted);
  }
}

export const logger = new Logger();
