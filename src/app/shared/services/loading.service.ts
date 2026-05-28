import { Injectable, signal } from '@angular/core';

export type LoadingPhase = 'loading' | 'particles' | 'text' | 'buttons' | 'done';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  readonly phase = signal<LoadingPhase>('loading');

  private timers: ReturnType<typeof setTimeout>[] = [];

  /**
   * 启动 Hero 动画序列。
   * 返回一个 cleanup 函数，组件应在 ngOnDestroy 中调用以取消待执行的定时器。
   */
  startHeroSequence(): () => void {
    this.cancelTimers();
    this.phase.set('loading');

    this.timers.push(setTimeout(() => this.phase.set('particles'), 200));
    this.timers.push(setTimeout(() => this.phase.set('text'), 1000));
    this.timers.push(setTimeout(() => this.phase.set('buttons'), 1600));
    this.timers.push(setTimeout(() => this.phase.set('done'), 2200));

    return () => this.cancelTimers();
  }

  /** 取消所有待执行的定时器 */
  cancelTimers(): void {
    this.timers.forEach(t => clearTimeout(t));
    this.timers = [];
  }
}
