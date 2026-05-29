import {
  Component,
  ChangeDetectionStrategy,
  signal,
  OnInit,
  OnDestroy,
  inject,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { I18nService } from '../../../../core/services/i18n.service';
import { LenisScrollService } from '../../../../core/services/lenis-scroll.service';
import { ThreeCanvasComponent } from '../../../../three/components/three-canvas/three-canvas.component';
import { TelemetryBarComponent } from '../../../../shared/components/hud/telemetry-bar.component';
import { CockpitDashboardScene } from '../../../../three/scenes/cockpit-dashboard.scene';
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
  imports: [ThreeCanvasComponent, TelemetryBarComponent],
})
export class CockpitDashboardSection implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly i18n = inject(I18nService);
  private readonly lenis = inject(LenisScrollService);

  /* ── Three.js scene ─────────────────────────────────────────────── */

  private scene: CockpitDashboardScene | null = null;

  readonly cockpitFactory = (canvas: HTMLCanvasElement) => {
    this.scene = new CockpitDashboardScene(canvas);
    return this.scene;
  };

  /* ── Timers & listeners ─────────────────────────────────────────── */

  private timeInterval: ReturnType<typeof setInterval> | null = null;
  private fpsInterval: ReturnType<typeof setInterval> | null = null;
  private sessionInterval: ReturnType<typeof setInterval> | null = null;
  private cleanupFns: (() => void)[] = [];

  /* ── i18n ───────────────────────────────────────────────────────── */

  t(key: string): string {
    return this.i18n.t('cockpit.' + key);
  }

  /* ── Visitor Signal ─────────────────────────────────────────────── */

  readonly localTime = signal(this.formatTime());
  readonly timezone = signal('');
  readonly browserLang = signal('');
  readonly device = signal('');
  readonly viewport = signal('');
  readonly dpr = signal('');
  readonly browser = signal('');
  readonly os = signal('');
  readonly network = signal('');
  readonly connection = signal('');
  readonly locationStatus = signal('');
  readonly weatherStatus = signal('');

  /* ── Session Metrics ────────────────────────────────────────────── */

  readonly currentPage = signal('');
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

  /* ── KPI stats ──────────────────────────────────────────────────── */

  readonly postsCount = signal(POSTS.length);
  readonly projectsCount = signal(PROJECTS.length);
  readonly aiNewsCount = signal(AI_FRONTLINE_NEWS.length);
  readonly aiResourcesCount = signal(LAB_AI_TOOLS.length + LAB_AI_PROJECTS.length);

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

  /* ── Content Sync ───────────────────────────────────────────────── */

  readonly syncBlogPosts = signal(POSTS.length);
  readonly syncProjects = signal(PROJECTS.length);
  readonly syncAiNews = signal(AI_FRONTLINE_NEWS.length);
  readonly syncAiTools = signal(LAB_AI_TOOLS.length);
  readonly syncAiFrameworks = signal(LAB_AI_PROJECTS.length);
  readonly syncLastAi = signal(this.formatSyncTime(AI_FRONTLINE_SOURCE.lastFetchedAt));
  readonly syncLastLab = signal(this.formatSyncTime(LAB_SOURCES.lastFetchedAt));
  readonly syncLastProject = signal(this.formatDate(new Date()));

  /* ── System Status ──────────────────────────────────────────────── */

  readonly rendererType = signal('');
  readonly fps = signal('--');
  readonly motionPref = signal('');
  readonly currentTheme = signal('');
  readonly buildMode = signal('GitHub Pages');
  readonly contentModeSys = signal('Markdown + JSON');
  readonly routerInfo = signal('Angular Router');
  readonly onlineStatus = signal('');
  readonly assetsStatus = signal('');

  private webglAvailable = false;
  private rafCount = 0;
  private fpsLastTime = 0;

  /* ── Analytics ──────────────────────────────────────────────────── */

  readonly analyticsMode = signal('');
  readonly pvValue = signal('');
  readonly uvValue = signal('');
  readonly popularPage = signal('');
  readonly analyticsSource = signal('');

  /* ── Command Log ────────────────────────────────────────────────── */

  readonly commandLog = signal<LogEntry[]>([]);

  /* ── Lifecycle ──────────────────────────────────────────────────── */

  ngOnInit(): void {
    this.sessionStart = Date.now();
    this.lastActivity = Date.now();
    this.entryRoute.set(this.router.url);
    this.currentPage.set(this.router.url);
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
    if (this.sessionInterval) clearInterval(this.sessionInterval);
    if (this.scrollThrottleId) cancelAnimationFrame(this.scrollThrottleId);
    this.cleanupFns.forEach((fn) => fn());
    this.cleanupFns = [];
    this.scene?.destroy();
    this.scene = null;
  }

  /* ── Init helpers ───────────────────────────────────────────────── */

  private initVisitorInfo(): void {
    this.timezone.set(this.getTimezone());
    this.browserLang.set(navigator.language || 'Unknown');
    this.device.set(this.detectDevice());
    this.viewport.set(`${window.innerWidth}×${window.innerHeight}`);
    this.dpr.set(String(window.devicePixelRatio || 1));
    this.browser.set(this.detectBrowser());
    this.os.set(this.detectOS());
    this.network.set(navigator.onLine ? this.t('onlineStatus') : this.t('offlineStatus'));
    this.connection.set(this.getConnectionType());
    this.locationStatus.set(this.t('permissionRequired'));
    this.weatherStatus.set(this.t('standby'));
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
    this.onlineStatus.set(navigator.onLine ? this.t('onlineStatus') : this.t('offlineStatus'));
    this.assetsStatus.set(this.t('loaded'));
  }

  private initAnalytics(): void {
    this.analyticsMode.set(this.t('localSession'));
    this.pvValue.set(this.t('notConnected'));
    this.uvValue.set(this.t('notConnected'));
    this.popularPage.set(this.t('awaitingData'));
    this.analyticsSource.set(this.t('notConnected'));
  }

  /* ── Timers ─────────────────────────────────────────────────────── */

  private _fpsRaf = 0;

  private startTimers(): void {
    // Clock — 1s
    this.timeInterval = setInterval(() => {
      this.localTime.set(this.formatTime());
      this.sessionTime.set(this.formatDuration(Date.now() - this.sessionStart));
      this.lastInteraction.set(this.formatDuration(Date.now() - this.lastActivity));
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
    }, 1000);

    // Force change detection for session time
    this.sessionInterval = setInterval(() => {}, 5000);
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
      this.currentPage.set(this.router.url);
      this.lastActivity = Date.now();
    });
    this.cleanupFns.push(() => routerSub.unsubscribe());

    const onlineHandler = () => {
      this.network.set(this.t('onlineStatus'));
      this.onlineStatus.set(this.t('onlineStatus'));
      this.pushLog('NET', this.t('logNetRestored'));
    };
    const offlineHandler = () => {
      this.network.set(this.t('offlineStatus'));
      this.onlineStatus.set(this.t('offlineStatus'));
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

  onReturnTop(): void {
    this.pushLog('NAV', this.t('logReturnTop'));
    this.lenis.scrollTo(0, { immediate: false });
  }

  onRestartOrbit(): void {
    this.pushLog('NAV', this.t('logRestartOrbit'));
    this.lenis.scrollTo(0, { immediate: false });
  }

  onEnterSite(): void {
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

  private detectOS(): string {
    const ua = navigator.userAgent;
    if (ua.includes('Win')) return 'Windows';
    if (ua.includes('Mac')) return 'macOS';
    if (ua.includes('Linux')) return 'Linux';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
    return 'Unknown';
  }

  private getTimezone(): string {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return 'Unknown';
    }
  }

  private getConnectionType(): string {
    const conn = (navigator as any).connection as NetworkInformation | undefined;
    if (!conn) return this.t('unsupportedLabel');
    return conn.effectiveType?.toUpperCase() || this.t('unsupportedLabel');
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
