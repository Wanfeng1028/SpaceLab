import { Injectable, NgZone, OnDestroy, signal, inject } from '@angular/core';
import Lenis from 'lenis';

/**
 * Lenis smooth-scroll service
 *
 * Provides a single Lenis instance across the app and exposes
 * reactive signals for scroll progress (0-1) of the whole page.
 *
 * 全局唯一 Lenis 实例 + 唯一 RAF 循环。
 * stop() 暂停，start() 恢复，不再有 idle 自动取消 RAF。
 */
@Injectable({ providedIn: 'root' })
export class LenisScrollService implements OnDestroy {
  private readonly ngZone = inject(NgZone);

  /** Raw Lenis instance */
  readonly instance = signal<Lenis | null>(null);

  /** Normalised page progress 0 → 1 */
  readonly scrollProgress = signal(0);

  /** Current scroll offset in CSS pixels */
  readonly scrollY = signal(0);

  private lenis!: Lenis;
  private rafId: number | null = null;
  private destroyed = false;

  constructor() {
    this.ngZone.runOutsideAngular(() => {
      this.lenis = new Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        orientation: 'vertical',
        gestureOrientation: 'vertical',
        smoothWheel: true,
        wheelMultiplier: 1,
        touchMultiplier: 2,
        infinite: false,
      });

      this.instance.set(this.lenis);

      const onScroll = ({ scroll, progress }: { scroll: number; progress: number }) => {
        this.ngZone.run(() => {
          this.scrollY.set(scroll);
          this.scrollProgress.set(progress);
        });
      };

      this.lenis.on('scroll', onScroll);
      this.ensureRaf();
    });
  }

  private ensureRaf(): void {
    if (this.rafId !== null || this.destroyed) return;

    const raf = (time: number) => {
      if (this.destroyed) {
        this.rafId = null;
        return;
      }

      this.lenis.raf(time);
      this.rafId = requestAnimationFrame(raf);
    };

    this.rafId = requestAnimationFrame(raf);
  }

  /** Programmatically scroll to [top] (CSS px) */
  scrollTo(top: number, opts?: { immediate?: boolean }) {
    this.lenis?.scrollTo(top, { immediate: !!opts?.immediate });
  }

  /** Recalculate wrapper/content dimensions after DOM changes */
  resize(): void {
    this.lenis?.resize();
  }

  /** Stop Lenis + cancel RAF (e.g. for nested scroll views like video feed) */
  stop(): void {
    this.lenis.stop();

    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  /** Resume Lenis + ensure RAF is running (idempotent) */
  start(): void {
    this.lenis.start();
    this.ensureRaf();
  }

  ngOnDestroy(): void {
    this.destroyed = true;

    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    this.lenis?.destroy();
  }
}
