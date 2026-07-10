import { Injectable, NgZone, OnDestroy, signal, inject } from '@angular/core';
import Lenis from 'lenis';

/**
 * Lenis smooth-scroll service
 *
 * Provides a single Lenis instance across the app and exposes
 * reactive signals for scroll progress (0-1) of the whole page.
 *
 * RAF loop pauses when user stops scrolling for 2s to save CPU/GPU.
 */
@Injectable({ providedIn: 'root' })
export class LenisScrollService implements OnDestroy {
  private readonly ngZone = inject(NgZone);

  /** Raw Lenis instance – null before first scroll listener */
  readonly instance = signal<Lenis | null>(null);

  /** Normalised page progress 0 → 1 */
  readonly scrollProgress = signal(0);

  /** Current scroll offset in CSS pixels */
  readonly scrollY = signal(0);

  private lenis!: Lenis;
  private rafId = 0;
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private isIdle = false;

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
        this.resetIdleTimer();
      };

      this.lenis.on('scroll', onScroll);

      const raf = (time: number) => {
        this.lenis.raf(time);
        this.rafId = requestAnimationFrame(raf);
      };
      this.rafId = requestAnimationFrame(raf);
      this.resetIdleTimer();
    });
  }

  private resetIdleTimer(): void {
    if (this.isIdle) {
      // Resume RAF
      this.isIdle = false;
      const raf = (time: number) => {
        this.lenis.raf(time);
        this.rafId = requestAnimationFrame(raf);
      };
      this.rafId = requestAnimationFrame(raf);
    }
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => {
      this.isIdle = true;
      cancelAnimationFrame(this.rafId);
    }, 2000);
  }

  /** Programmatically scroll to [top] (CSS px) */
  scrollTo(top: number, opts?: { immediate?: boolean }) {
    this.lenis?.scrollTo(top, { immediate: !!opts?.immediate });
  }

  /** Recalculate wrapper/content dimensions after DOM changes */
  resize(): void {
    this.lenis?.resize();
  }

  /** Fully stop the RAF loop and idle timer (e.g. for nested scroll views) */
  stop(): void {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = null;
    cancelAnimationFrame(this.rafId);
    this.isIdle = false;
  }

  /** Restart the RAF loop if it was paused by the idle timer */
  start(): void {
    if (this.isIdle) {
      this.isIdle = false;
      const raf = (time: number) => {
        this.lenis.raf(time);
        this.rafId = requestAnimationFrame(raf);
      };
      this.rafId = requestAnimationFrame(raf);
    }
    this.resetIdleTimer();
  }

  ngOnDestroy() {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    cancelAnimationFrame(this.rafId);
    this.lenis?.destroy();
  }
}
