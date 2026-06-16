import { Injectable, ErrorHandler, inject } from '@angular/core';
import { environment } from '../../../environments/environment';

export interface ErrorLogEntry {
  level: 'error' | 'warn' | 'info';
  message: string;
  stack?: string;
  url?: string;
  userAgent?: string;
  timestamp: string;
  extra?: Record<string, unknown>;
}

/**
 * 前端错误日志服务
 *
 * 在开发环境打印到 console，生产环境可扩展为发送到后端 API。
 */
@Injectable({ providedIn: 'root' })
export class ErrorLogService {
  private apiUrl = environment.apiUrl;

  log(level: ErrorLogEntry['level'], message: string, extra?: Record<string, unknown>): void {
    const entry: ErrorLogEntry = {
      level,
      message,
      url: typeof window !== 'undefined' ? window.location.href : '',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      timestamp: new Date().toISOString(),
      extra,
    };

    if (!environment.production) {
      const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
      fn(`[ErrorLog] ${message}`, extra ?? '');
    }

    // 生产环境可发送到后端
    if (environment.production) {
      // 使用 sendBeacon 避免影响页面卸载
      try {
        const blob = new Blob([JSON.stringify(entry)], { type: 'application/json' });
        navigator.sendBeacon(`${this.apiUrl}/analytics/event`, blob);
      } catch {
        // 静默失败
      }
    }
  }

  error(message: string, extra?: Record<string, unknown>): void {
    this.log('error', message, extra);
  }

  warn(message: string, extra?: Record<string, unknown>): void {
    this.log('warn', message, extra);
  }

  info(message: string, extra?: Record<string, unknown>): void {
    this.log('info', message, extra);
  }
}

/**
 * Angular 全局错误处理器 — 捕获未处理的异常
 */
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private errorLog = inject(ErrorLogService);

  handleError(error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    this.errorLog.error(message, { stack, type: 'unhandled' });
    // 仍然在开发环境抛出以便调试
    if (!environment.production) {
      console.error('[GlobalErrorHandler]', error);
    }
  }
}
