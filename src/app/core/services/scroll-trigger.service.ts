import { Injectable, NgZone, OnDestroy, inject, signal } from '@angular/core';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/**
 * Centralised ScrollTrigger helpers
 *
 * Registers the plugin once, manages instances per section,
 * and exposes reactive signals for section entry / exit.
 */
@Injectable({ providedIn: 'root' })
export class ScrollTriggerService implements OnDestroy {
  private readonly ngZone = inject(NgZone);
  private triggers: ScrollTrigger[] = [];

  /** Track active section index (0-based) */
  readonly activeSection = signal(0);

  constructor() {
    gsap.registerPlugin(ScrollTrigger);
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
    } = {}
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
      const st = ScrollTrigger.create({
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
    fromVars: gsap.TweenVars,
    opts: {
      trigger?: HTMLElement | string;
      start?: string;
      end?: string;
      toggleActions?: string;
    } = {}
  ) {
    const defaults = {
      start: 'top 80%',
      end: 'top 20%',
      toggleActions: 'play none none reverse',
    };

    const config = { ...defaults, ...opts };

    return this.ngZone.runOutsideAngular(() => {
      const st = gsap.fromTo(
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
        }
      );

      return st;
    });
  }

  /**
   * Refresh all ScrollTrigger positions (call after DOM changes)
   */
  refresh() {
    ScrollTrigger.refresh();
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
