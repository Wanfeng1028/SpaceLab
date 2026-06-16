import { Injectable, NgZone, OnDestroy, inject, signal } from '@angular/core';

/**
 * Centralised ScrollTrigger helpers
 *
 * Registers the plugin once, manages instances per section,
 * and exposes reactive signals for section entry / exit.
 *
 * NOTE: GSAP is dynamically imported to avoid adding
 * 183 kB to the initial bundle.
 */
@Injectable()
export class ScrollTriggerService implements OnDestroy {
  private readonly ngZone = inject(NgZone);
  private gsap: any = null;
  private ST: any = null;
  private triggers: any[] = [];
  private ready = false;

  /** Track active section index (0-based) */
  readonly activeSection = signal(0);

  /** Initialize GSAP â€?call once before using this service */
  async init(): Promise<void> {
    if (this.ready) return;
    const [gsapModule, stModule] = await Promise.all([
      import('gsap'),
      import('gsap/ScrollTrigger'),
    ]);
    this.gsap = gsapModule.default || gsapModule;
    this.ST = stModule.ScrollTrigger || stModule;
    this.gsap.registerPlugin(this.ST);
    this.ready = true;
  }

  /** Ensure GSAP is loaded before running a callback */
  private ensureReady(): void {
    if (!this.ready) throw new Error('ScrollTriggerService: call init() first');
  }

  /**
   * Create a pinned section scrub animation
   * @param trigger CSS selector / element for the section
   * @param opts Pin duration, start/end markers, etc.
   */
  createSection(
    trigger: HTMLElement | string,
    opts: {
      pin?: boolean;
      scrub?: number | boolean;
      start?: string;
      end?: string;
      markers?: boolean;
      onEnter?: () => void;
      onLeave?: () => void;
      onEnterBack?: () => void;
      onLeaveBack?: () => void;
    } = {},
  ) {
    const defaults = {
      pin: true,
      scrub: 1,
      start: 'top top',
      end: '+=100%',
      markers: false,
    };

    const config = { ...defaults, ...opts };

    return this.ngZone.runOutsideAngular(() => {
      const st = this.ST.create({
        trigger,
        pin: config.pin,
        scrub: config.scrub,
        start: config.start,
        end: config.end,
        markers: config.markers,
        onEnter: () => this.ngZone.run(() => config.onEnter?.()),
        onLeave: () => this.ngZone.run(() => config.onLeave?.()),
        onEnterBack: () => this.ngZone.run(() => config.onEnterBack?.()),
        onLeaveBack: () => this.ngZone.run(() => config.onLeaveBack?.()),
      });

      this.triggers.push(st);
      return st;
    });
  }

  /**
   * Create a section entrance animation (opacity / transform)
   */
  createEntrance(
    target: HTMLElement | string,
    fromVars: any,
    opts: {
      trigger?: HTMLElement | string;
      start?: string;
      end?: string;
      toggleActions?: string;
    } = {},
  ) {
    const defaults = {
      start: 'top 80%',
      end: 'top 20%',
      toggleActions: 'play none none reverse',
    };

    const config = { ...defaults, ...opts };

    return this.ngZone.runOutsideAngular(() => {
      const st = this.gsap.fromTo(
        target,
        { opacity: 0, ...fromVars },
        {
          opacity: 1,
          x: 0,
          y: 0,
          scale: 1,
          rotation: 0,
          duration: 1,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: config.trigger || target,
            start: config.start,
            end: config.end,
            toggleActions: config.toggleActions,
          },
        },
      );

      return st;
    });
  }

  /**
   * Refresh all ScrollTrigger positions (call after DOM changes)
   */
  refresh() {
    this.ensureReady();
    this.ST.refresh();
  }

  /**
   * Kill all managed triggers
   */
  killAll() {
    this.triggers.forEach((st) => st.kill());
    this.triggers = [];
  }

  ngOnDestroy() {
    this.killAll();
  }
}
