import { Injectable, signal } from '@angular/core';
import { ToastItem } from '../components/toast/toast.component';

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<ToastItem[]>([]);

  private counter = 0;

  /** 显示成功通知 */
  success(title: string, message: string, duration = 5000): void {
    this.addToast({
      id: (++this.counter).toString(),
      title,
      message,
      type: 'success',
      duration,
    });
  }

  /** 显示信息通知 */
  info(title: string, message: string, duration = 5000): void {
    this.addToast({
      id: (++this.counter).toString(),
      title,
      message,
      type: 'info',
      duration,
    });
  }

  /** 显示警告通知 */
  warning(title: string, message: string, duration = 5000): void {
    this.addToast({
      id: (++this.counter).toString(),
      title,
      message,
      type: 'warning',
      duration,
    });
  }

  /** 显示错误通知 */
  error(title: string, message: string, duration = 5000): void {
    this.addToast({
      id: (++this.counter).toString(),
      title,
      message,
      type: 'error',
      duration,
    });
  }

  /** 添加通知 */
  private addToast(toast: ToastItem): void {
    this.toasts.update((list) => [...list, toast]);

    const duration = toast.duration || 5000;
    if (duration > 0) {
      setTimeout(() => {
        this.removeToast(toast.id);
      }, duration);
    }
  }

  /** 移除通知 */
  removeToast(id: string): void {
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }

  /** 清除所有通知 */
  clearAll(): void {
    this.toasts.set([]);
  }
}
