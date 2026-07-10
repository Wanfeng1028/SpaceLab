import {
  Component,
  ChangeDetectionStrategy,
  signal,
  OnInit,
  OnDestroy,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatToolbarModule } from '@angular/material/toolbar';
import { I18nService } from '../../../../core/services/i18n.service';
import { LenisScrollService } from '../../../../core/services/lenis-scroll.service';
import { TelemetryBarComponent } from '../../../../shared/components/hud/telemetry-bar.component';
import {
  POSTS,
  PROJECTS,
  AI_FRONTLINE_NEWS,
  AI_FRONTLINE_SOURCE,
  LAB_AI_TOOLS,
  LAB_AI_PROJECTS,
  LAB_SOURCES,
} from '../../../../../generated/content.generated';

/* ── Log entry ─────────────────────────────────────────────────────── */

interface LogEntry {
  time: string;
  tag: string;
  message: string;
}

/* ── Network Information API ───────────────────────────────────────── */

interface NetworkInformation {
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
}

/* ── Component ─────────────────────────────────────────────────────── */

@Component({
  selector: 'app-cockpit-dashboard',
  templateUrl: './cockpit-dashboard.component.html',
  styleUrl: './cockpit-dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatChipsModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatListModule,
    MatTooltipModule,
    MatProgressBarModule,
    MatToolbarModule,
    TelemetryBarComponent,
  ],
})
export class CockpitDashboardSection implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly i18n = inject(I18nService);
  private readonly lenis = inject(LenisScrollService);

  /* ── Timers & listeners ─────────────────────────────────────────── */

  private timeInterval: ReturnType<typeof setInterval> | null = null;
  private fpsInterval: ReturnType<typeof setInterval> | null = null;
  private cleanupFns: (() => void)[] = [];

  /* ── i18n ───────────────────────────────────────────────────────── */

  t(key: string): string {
    return this.i18n.t('cockpit.' + key);
  }

  /* ── Visitor Signal ─────────────────────────────────────────────── */

  readonly localTime = signal(this.formatTime());
  readonly timezone = signal('');
  readonly language = signal('');
  readonly device = signal('');
  readonly viewport = signal('');
  readonly browser = signal('');

  /* ── Site Pulse ─────────────────────────────────────────────────── */

  readonly siteMode = signal('GitHub Pages Static');
  readonly contentModeVal = signal('Markdown + JSON');
  readonly lastBuildTime = signal(this.formatDate(new Date()));
  readonly lastSyncTime = signal(this.formatSyncTime(AI_FRONTLINE_SOURCE.lastFetchedAt));
  readonly totalPages = signal(
    POSTS.length +
      PROJECTS.length +
      AI_FRONTLINE_NEWS.length +
      LAB_AI_TOOLS.length +
      LAB_AI_PROJECTS.length +
      6,
  );
  readonly currentLang = signal('');

  /* ── System Status ──────────────────────────────────────────────── */

  readonly rendererType = signal('');
  readonly fps = signal('--');
  readonly motionPref = signal('');
  readonly currentTheme = signal('');
  readonly buildMode = signal('GitHub Pages');
  readonly routerInfo = signal('Angular Router');

  private webglAvailable = false;
  private rafCount = 0;
  private fpsLastTime = 0;

  /* ── Session Metrics ────────────────────────────────────────────── */

  readonly sessionTime = signal('');
  readonly scrollDepth = signal('0%');
  readonly clickCount = signal(0);
  readonly routeChanges = signal(0);
  readonly lastInteraction = signal('');
  readonly entryRoute = signal('');

  private sessionStart = 0;
  private clicks = 0;
  private routeCount = 0;
  private lastActivity = 0;
  private scrollThrottleId: number | null = null;

  /* ── Content Sync ───────────────────────────────────────────────── */

  readonly syncBlogPosts = signal(POSTS.length);
  readonly syncProjects = signal(PROJECTS.length);
  readonly syncAiNews = signal(AI_FRONTLINE_NEWS.length);
  readonly syncAiTools = signal(LAB_AI_TOOLS.length);
  readonly syncAiFrameworks = signal(LAB_AI_PROJECTS.length);
  readonly syncLastAi = signal(this.formatSyncTime(AI_FRONTLINE_SOURCE.lastFetchedAt));

  /* ── Analytics ──────────────────────────────────────────────────── */

  readonly analyticsMode = signal('');
  readonly pvValue = signal('');
  readonly uvValue = signal('');
  readonly popularPage = signal('');
  readonly analyticsSource = signal('');

  /* ── KPI stats ──────────────────────────────────────────────────── */

  readonly postsCount = signal(POSTS.length);
  readonly projectsCount = signal(PROJECTS.length);
  readonly aiNewsCount = signal(AI_FRONTLINE_NEWS.length);
  readonly aiResourcesCount = signal(LAB_AI_TOOLS.length + LAB_AI_PROJECTS.length);

  /* ── Command Log ────────────────────────────────────────────────── */

  readonly commandLog = signal<LogEntry[]>([]);

  /* ── Compact data arrays ────────────────────────────────────────── */

  readonly visitorSignals = signal<{ label: string; value: string }[]>([]);
  readonly sitePulse = signal<{ label: string; value: string }[]>([]);
  readonly systemStatus = signal<{ label: string; value: string }[]>([]);
  readonly sessionMetrics = signal<{ label: string; value: string }[]>([]);
  readonly contentSync = signal<{ label: string; value: string }[]>([]);
  readonly analyticsData = signal<{ label: string; value: string }[]>([]);

  /* ── Lifecycle ──────────────────────────────────────────────────── */

  ngOnInit(): void {
    this.sessionStart = Date.now();
    this.lastActivity = Date.now();
    this.entryRoute.set(this.router.url);
    this.currentLang.set(this.i18n.isZh() ? '中文' : 'English');

    this.initVisitorInfo();
    this.initSystemStatus();
    this.initAnalytics();
    this.startTimers();
    this.bindListeners();

    this.pushLog('SYS', this.t('logInit'));
    this.pushLog('VISITOR', this.t('logSignal'));
    this.pushLog('CONTENT', this.t('logContentLoaded'));
    this.pushLog('AI', this.t('logAiOnline'));
    this.pushLog('WEBGL', this.t('logRendererStable'));
  }

  ngOnDestroy(): void {
    if (this.timeInterval) clearInterval(this.timeInterval);
    if (this.fpsInterval) clearInterval(this.fpsInterval);
    if (this.scrollThrottleId) cancelAnimationFrame(this.scrollThrottleId);
    this.cleanupFns.forEach((fn) => fn());
    this.cleanupFns = [];
  }

  /* ── Init helpers ───────────────────────────────────────────────── */

  private initVisitorInfo(): void {
    this.timezone.set(this.getTimezone());
    this.language.set(navigator.language || 'Unknown');
    this.device.set(this.detectDevice());
    this.viewport.set(`${window.innerWidth}×${window.innerHeight}`);
    this.browser.set(this.detectBrowser());

    this.visitorSignals.set([
      { label: this.t('localTime'), value: this.localTime() },
      { label: this.t('timezone'), value: this.timezone() },
      { label: this.t('language'), value: this.language() },
      { label: this.t('device'), value: this.device() },
      { label: this.t('viewport'), value: this.viewport() },
      { label: this.t('browser'), value: this.browser() },
    ]);
  }

  private initSystemStatus(): void {
    this.webglAvailable = this.checkWebGL();
    this.rendererType.set(this.webglAvailable ? 'WebGL' : 'CSS Fallback');
    this.motionPref.set(
      matchMedia('(prefers-reduced-motion: reduce)').matches
        ? this.t('reduced')
        : this.t('enabled'),
    );
    this.currentTheme.set(
      document.documentElement.classList.contains('light-theme') ? this.t('light') : this.t('dark'),
    );

    this.systemStatus.set([
      { label: this.t('renderer'), value: this.rendererType() },
      { label: this.t('fps'), value: this.fps() },
      { label: this.t('motion'), value: this.motionPref() },
      { label: this.t('theme'), value: this.currentTheme() },
      { label: this.t('buildMode'), value: this.buildMode() },
      { label: this.t('router'), value: this.routerInfo() },
    ]);

    this.sitePulse.set([
      { label: this.t('siteMode'), value: this.siteMode() },
      { label: this.t('contentMode'), value: this.contentModeVal() },
      { label: this.t('lastBuild'), value: this.lastBuildTime() },
      { label: this.t('lastSync'), value: this.lastSyncTime() },
      { label: this.t('totalPages'), value: String(this.totalPages()) },
      { label: this.t('currentLang'), value: this.currentLang() },
    ]);
  }

  private initAnalytics(): void {
    this.analyticsMode.set(this.t('localSession'));
    this.pvValue.set(this.t('notConnected'));
    this.uvValue.set(this.t('notConnected'));
    this.popularPage.set(this.t('awaitingData'));
    this.analyticsSource.set(this.t('notConnected'));

    this.analyticsData.set([
      { label: this.t('analyticsMode'), value: this.analyticsMode() },
      { label: this.t('pv'), value: this.pvValue() },
      { label: this.t('uv'), value: this.uvValue() },
      { label: this.t('popularPage'), value: this.popularPage() },
      { label: this.t('dataSource'), value: this.analyticsSource() },
    ]);
  }

  /* ── Timers ─────────────────────────────────────────────────────── */

  private _fpsRaf = 0;

  private startTimers(): void {
    // Clock — 1s
    this.timeInterval = setInterval(() => {
      this.localTime.set(this.formatTime());
      this.sessionTime.set(this.formatDuration(Date.now() - this.sessionStart));
      this.lastInteraction.set(this.formatDuration(Date.now() - this.lastActivity));

      // Update visitor signals
      this.visitorSignals.update((signals) =>
        signals.map((s) =>
          s.label === this.t('localTime') ? { ...s, value: this.localTime() } : s,
        ),
      );

      // Update session metrics
      this.sessionMetrics.set([
        { label: this.t('sessionTime'), value: this.sessionTime() },
        { label: this.t('scrollDepth'), value: this.scrollDepth() },
        { label: this.t('clickCount'), value: String(this.clickCount()) },
        { label: this.t('routeChanges'), value: String(this.routeChanges()) },
        { label: this.t('lastInteraction'), value: this.lastInteraction() },
      ]);
    }, 1000);

    // FPS — 1s
    this.fpsLastTime = performance.now();
    this.rafCount = 0;
    const countFrame = () => {
      this.rafCount++;
      this._fpsRaf = requestAnimationFrame(countFrame);
    };
    this._fpsRaf = requestAnimationFrame(countFrame);
    this.fpsInterval = setInterval(() => {
      const now = performance.now();
      const elapsed = (now - this.fpsLastTime) / 1000;
      const currentFps = Math.round(this.rafCount / elapsed);
      this.fps.set(String(currentFps));
      this.rafCount = 0;
      this.fpsLastTime = now;

      // Update system status
      this.systemStatus.update((status) =>
        status.map((s) =>
          s.label === this.t('fps') ? { ...s, value: this.fps() } : s,
        ),
      );
    }, 1000);

    // Content sync
    this.contentSync.set([
      { label: this.t('syncBlogPosts'), value: String(this.syncBlogPosts()) },
      { label: this.t('syncProjects'), value: String(this.syncProjects()) },
      { label: this.t('syncAiNews'), value: String(this.syncAiNews()) },
      { label: this.t('syncAiTools'), value: String(this.syncAiTools()) },
      { label: this.t('syncAiFrameworks'), value: String(this.syncAiFrameworks()) },
      { label: this.t('syncLastAi'), value: this.syncLastAi() },
    ]);
  }

  /* ── Event listeners ────────────────────────────────────────────── */

  private bindListeners(): void {
    const clickHandler = () => {
      this.clicks++;
      this.clickCount.set(this.clicks);
      this.lastActivity = Date.now();
    };
    document.addEventListener('click', clickHandler);
    this.cleanupFns.push(() => document.removeEventListener('click', clickHandler));

    const scrollHandler = () => {
      if (this.scrollThrottleId) return;
      this.scrollThrottleId = requestAnimationFrame(() => {
        this.scrollThrottleId = null;
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const depth = docHeight > 0 ? Math.round((scrollTop / docHeight) * 100) : 0;
        this.scrollDepth.set(`${depth}%`);
      });
    };
    window.addEventListener('scroll', scrollHandler, { passive: true });
    this.cleanupFns.push(() => window.removeEventListener('scroll', scrollHandler));

    const routerSub = this.router.events.subscribe(() => {
      this.routeCount++;
      this.routeChanges.set(this.routeCount);
      this.lastActivity = Date.now();
    });
    this.cleanupFns.push(() => routerSub.unsubscribe());

    const onlineHandler = () => {
      this.pushLog('NET', this.t('logNetRestored'));
    };
    const offlineHandler = () => {
      this.pushLog('NET', this.t('logNetDisconnected'));
    };
    window.addEventListener('online', onlineHandler);
    window.addEventListener('offline', offlineHandler);
    this.cleanupFns.push(() => {
      window.removeEventListener('online', onlineHandler);
      window.removeEventListener('offline', offlineHandler);
    });

    const resizeHandler = () => {
      this.viewport.set(`${window.innerWidth}×${window.innerHeight}`);
      this.visitorSignals.update((signals) =>
        signals.map((s) =>
          s.label === this.t('viewport') ? { ...s, value: this.viewport() } : s,
        ),
      );
    };
    window.addEventListener('resize', resizeHandler);
    this.cleanupFns.push(() => window.removeEventListener('resize', resizeHandler));

    const keyHandler = () => {
      this.lastActivity = Date.now();
    };
    document.addEventListener('keydown', keyHandler);
    this.cleanupFns.push(() => document.removeEventListener('keydown', keyHandler));
  }

  /* ── Actions ────────────────────────────────────────────────────── */

  scrollToTop(): void {
    this.pushLog('NAV', this.t('logReturnTop'));
    this.lenis.scrollTo(0, { immediate: false });
  }

  restartOrbit(): void {
    this.pushLog('NAV', this.t('logRestartOrbit'));
    this.lenis.scrollTo(0, { immediate: false });
  }

  enterSite(): void {
    this.pushLog('NAV', this.t('logEnterSite'));
    this.router.navigate(['/blog']);
  }

  /* ── Command log ────────────────────────────────────────────────── */

  private pushLog(tag: string, message: string): void {
    const time = new Date().toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    this.commandLog.update((log) => [...log.slice(-19), { time, tag, message }]);
  }

  /* ── Detection helpers ──────────────────────────────────────────── */

  private detectDevice(): string {
    const w = window.innerWidth;
    if (w < 768) return this.t('mobile');
    if (w < 1024) return this.t('tablet');
    return this.t('desktop');
  }

  private detectBrowser(): string {
    const ua = navigator.userAgent;
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Edg/')) return 'Edge';
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Safari')) return 'Safari';
    return 'Unknown';
  }

  private getTimezone(): string {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return 'Unknown';
    }
  }

  private checkWebGL(): boolean {
    try {
      const c = document.createElement('canvas');
      return !!(c.getContext('webgl') || c.getContext('webgl2'));
    } catch {
      return false;
    }
  }

  /* ── Formatters ─────────────────────────────────────────────────── */

  private formatTime(): string {
    return new Date().toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  }

  private formatDuration(ms: number): string {
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    const zh = this.i18n.isZh();
    if (h > 0) return `${h}${zh ? '时' : 'h'} ${m}${zh ? '分' : 'm'} ${s}${zh ? '秒' : 's'}`;
    if (m > 0) return `${m}${zh ? '分' : 'm'} ${s}${zh ? '秒' : 's'}`;
    return `${s}${zh ? '秒' : 's'}`;
  }

  private formatDate(d: Date): string {
    return d.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  }

  private formatSyncTime(iso: string): string {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '--';
    }
  }
}