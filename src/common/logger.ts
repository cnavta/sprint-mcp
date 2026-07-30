/**
 * Logging facade for consistent output across the MCP server.
 * All logs are written to stderr to avoid interference with MCP stdio protocol.
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

class Logger {
  private level: LogLevel;

  constructor(level: LogLevel = LogLevel.INFO) {
    this.level = level;
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.DEBUG) {
      this.log('DEBUG', message, ...args);
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.INFO) {
      this.log('INFO', message, ...args);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.WARN) {
      this.log('WARN', message, ...args);
    }
  }

  error(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.ERROR) {
      this.log('ERROR', message, ...args);
    }
  }

  private log(level: string, message: string, ...args: unknown[]): void {
    const timestamp = new Date().toISOString();
    const formattedArgs = args.length > 0 ? ' ' + JSON.stringify(args) : '';
    // Use stderr to avoid interfering with MCP stdio protocol
    console.error(`[${timestamp}] [${level}] ${message}${formattedArgs}`);
  }
}

// Export singleton instance
export const logger = new Logger(
  process.env.LOG_LEVEL === 'debug' ? LogLevel.DEBUG : LogLevel.INFO
);
