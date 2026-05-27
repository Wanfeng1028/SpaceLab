import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  HostListener,
  ElementRef,
  inject,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { ToastService } from '../../services/toast.service';

export interface ToastItem {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
  duration?: number;
}

@Component({
  selector: 'app-toast',
  templateUrl: './toast.component.html',
  styleUrl: './toast.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
})
export class ToastComponent implements OnInit, OnDestroy {
  private elRef = inject(ElementRef);
  private toastService = inject(ToastService);

  /** Toast 列表 */
  readonly toasts = this.toastService.toasts;

  /** 自动关闭延迟（毫秒） */
  readonly defaultDuration = input(5000);

  /** 关闭事件 */
  readonly closed = output<string>();

  ngOnInit(): void {
    // Toasts are created on demand via ToastService
  }

  ngOnDestroy(): void {
    // 无需清理，服务会处理
  }

  removeToast(id: string): void {
    this.toastService.removeToast(id);
    this.closed.emit(id);
  }
}