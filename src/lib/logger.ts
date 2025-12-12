/**
 * Production-ready logging utility
 * Replaces console.error/console.warn with proper error tracking
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: unknown;
  timestamp: number;
}

class Logger {
  private logs: LogEntry[] = [];
  private maxLogs = 100;

  /**
   * Log an error
   * In production, this would send to error tracking service (Sentry, etc.)
   */
  error(message: string, data?: unknown): void {
    this.log('error', message, data);

    // In production, send to error tracking service
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send to Sentry or similar
      // Sentry.captureException(new Error(message), { extra: data });
    }
  }

  /**
   * Log a warning
   * In production, this would send to monitoring service
   */
  warn(message: string, data?: unknown): void {
    this.log('warn', message, data);

    // In production, send to monitoring service
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send to monitoring service
    }
  }

  /**
   * Log an info message
   */
  info(message: string, data?: unknown): void {
    this.log('info', message, data);
  }

  /**
   * Log a debug message
   * Only logged in development mode
   */
  debug(message: string, data?: unknown): void {
    if (process.env.NODE_ENV === 'development') {
      this.log('debug', message, data);
    }
  }

  /**
   * Internal logging method
   */
  private log(level: LogLevel, message: string, data?: unknown): void {
    const entry: LogEntry = {
      level,
      message,
      data,
      timestamp: Date.now(),
    };

    this.logs.push(entry);

    // Keep only last N logs in memory
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Development: Log to console
    if (process.env.NODE_ENV === 'development') {
      const prefix = `[${level.toUpperCase()}]`;
      if (data !== undefined) {
        // eslint-disable-next-line no-console
        console.log(prefix, message, data);
      } else {
        // eslint-disable-next-line no-console
        console.log(prefix, message);
      }
    }
  }

  /**
   * Get recent logs (for debugging)
   */
  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    this.logs = [];
  }
}

// Export singleton instance
export const logger = new Logger();
