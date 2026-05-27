import { Injectable, NgZone, OnDestroy, signal, inject } from '@angular/core';
import Lenis from 'lenis';

/**
 * Lenis smooth-scroll service
 *
 * Provides a single Lenis instance across the app and exposes
 * reactive signals for scroll progress (0-1) of the whole page.
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

      const raf = (time: number) => {
        this.lenis.raf(time);
        this.rafId = requestAnimationFrame(raf);
      };
      this.rafId = requestAnimationFrame(raf);
    });
  }

  /** Programmatically scroll to [top] (CSS px) */
  scrollTo(top: number, opts?: { immediate?: boolean }) {
    this.lenis?.scrollTo(top, { immediate: !!opts?.immediate });
  }

  ngOnDestroy() {
    cancelAnimationFrame(this.rafId);
    this.lenis?.destroy();
  }
}
