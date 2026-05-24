import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type LoadingPhase = 'loading' | 'particles' | 'text' | 'buttons' | 'done';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private phase$ = new BehaviorSubject<LoadingPhase>('loading');
  readonly phase = this.phase$.asObservable();

  /** 启动 Hero 动画序列 */
  startHeroSequence(): void {
    this.setPhase('loading');

    setTimeout(() => this.setPhase('particles'), 200);
    setTimeout(() => this.setPhase('text'), 1000);
    setTimeout(() => this.setPhase('buttons'), 1600);
    setTimeout(() => this.setPhase('done'), 2200);
  }

  private setPhase(phase: LoadingPhase): void {
    this.phase$.next(phase);
  }
}
