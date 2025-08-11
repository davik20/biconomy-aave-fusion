/**
 * @fileoverview logging utility with colored output
 */

import type { LogLevel } from '../types';

// color codes for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  white: '\x1b[37m',
};

export interface LogContext {
  readonly component?: string;
  readonly txHash?: string;
  readonly address?: string;
  readonly amount?: string;
  readonly [key: string]: unknown;
}

export class Logger {
  private static instance: Logger;
  private readonly logLevel: LogLevel;

  constructor(logLevel: LogLevel = 'info') {
    this.logLevel = logLevel;
  }

  static getInstance(logLevel?: LogLevel): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger(logLevel);
    }
    return Logger.instance;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
    };
    return levels[level] >= levels[this.logLevel];
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toLocaleTimeString();
    const levelStr = level.toUpperCase().padEnd(5);
    
    let formatted = `[${timestamp}] ${levelStr} ${message}`;
    
    if (context) {
      const contextStr = Object.entries(context)
        .map(([key, value]) => `${key}=${value}`)
        .join(' ');
      formatted += ` | ${contextStr}`;
    }
    
    return formatted;
  }

  debug(message: string, context?: LogContext): void {
    if (!this.shouldLog('debug')) return;
    console.log(`${colors.gray}${this.formatMessage('debug', message, context)}${colors.reset}`);
  }

  info(message: string, context?: LogContext): void {
    if (!this.shouldLog('info')) return;
    console.log(`${colors.blue}${this.formatMessage('info', message, context)}${colors.reset}`);
  }

  warn(message: string, context?: LogContext): void {
    if (!this.shouldLog('warn')) return;
    console.log(`${colors.yellow}${this.formatMessage('warn', message, context)}${colors.reset}`);
  }

  error(message: string, context?: LogContext): void {
    if (!this.shouldLog('error')) return;
    console.error(`${colors.red}${this.formatMessage('error', message, context)}${colors.reset}`);
  }

  success(message: string, context?: LogContext): void {
    console.log(`${colors.green}✓ ${message}${colors.reset}`);
    if (context) {
      Object.entries(context).forEach(([key, value]) => {
        console.log(`   ${colors.gray}${key}:${colors.reset} ${value}`);
      });
    }
  }

  step(step: number, message: string, context?: LogContext): void {
    console.log(`${colors.cyan}[${step}]${colors.reset} ${message}`);
    if (context) {
      Object.entries(context).forEach(([key, value]) => {
        console.log(`    ${colors.gray}${key}:${colors.reset} ${value}`);
      });
    }
  }

  header(title: string): void {
    console.log(`\n${colors.blue}${title}${colors.reset}`);
    console.log(`${colors.gray}${'='.repeat(title.length)}${colors.reset}`);
  }

  section(title: string, items: string[]): void {
    console.log(`\n${colors.white}${title}:${colors.reset}`);
    items.forEach(item => {
      console.log(`  • ${item}`);
    });
  }

  clear(): void {
    console.clear();
  }
}

// Convenience export
export const logger = Logger.getInstance(
  (process.env.LOG_LEVEL as LogLevel) || 'info'
);

export const log = {
  debug: (message: string, context?: LogContext) => logger.debug(message, context),
  info: (message: string, context?: LogContext) => logger.info(message, context),
  warn: (message: string, context?: LogContext) => logger.warn(message, context),
  error: (message: string, context?: LogContext) => logger.error(message, context),
  success: (message: string, context?: LogContext) => logger.success(message, context),
  step: (step: number, message: string, context?: LogContext) => logger.step(step, message, context),
  header: (title: string) => logger.header(title),
  section: (title: string, items: string[]) => logger.section(title, items),
  clear: () => logger.clear(),
}; 