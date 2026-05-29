import {
  Component,
  ChangeDetectionStrategy,
  signal,
  HostListener,
  OnInit,
  OnDestroy,
  inject,
  computed,
} from '@angular/core';
import { Router } from '@angular/router';
import { I18nService } from '../../../../core/services/i18n.service';
import { LenisScrollService } from '../../../../core/services/lenis-scroll.service';
import { ThreeCanvasComponent } from '../../../../three/components/three-canvas/three-canvas.component';
import { HudFrameComponent } from '../../../../shared/components/hud/hud-frame.component';
import { TelemetryBarComponent } from '../../../../shared/components/hud/telemetry-bar.component';
import { CockpitDashboardScene } from '../../../../three/scenes/cockpit-dashboard.scene';
import {
  POSTS,
  PROJECTS,
  AI_FRONTLINE_NEWS,
  AI_FRONTLINE_SOURCE,
  GALLERY,
} from '../../../../../generated/content.generated';

/* ── i18n ──────────────────────────────────────────────────────────── */

type Lang = 'zh' | 'en';

const TEXT: Record<Lang, Record<string, string>> = {
  zh: {
    sectionIndex: '07',
    title: '驾驶舱总控台',
    subtitle: 'SpaceLab 系统控制中心',
    visitorSignal: '访问者信号',
    sessionMetrics: '会话指标',
    sitePulse: '站点脉搏',
    contentSync: '内容同步',
    systemStatus: '系统状态',
    analyticsStatus: '访问统计',
    commandLog: '系统日志',
    // Visitor Signal
    localTime: '本地时间',
    timezone: '时区',
    language: '语言',
    device: '设备',
    viewport: '视口',
    dpr: '屏幕像素比',
    browser: '浏览器',
    os: '操作系统',
    network: '网络',
    connection: '连接类型',
    location: '定位',
    weather: '天气',
    // Session Metrics
    currentPage: '当前页面',
    sessionTime: '停留时长',
    scrollDepth: '滚动深度',
    clickCount: '点击次数',
    routeChanges: '页面切换',
    lastInteraction: '最近交互',
    entryRoute: '进入页面',
    // Site Pulse
    posts: '文章',
    projects: '项目',
    aiNews: 'AI 前线',
    gallery: '画廊',
    lastBuild: '最近构建',
    // Content Sync
    aiSync: 'AI 前线同步',
    projectSync: '项目同步',
    postSync: '文章同步',
    source: '数据源',
    // System Status
    renderer: '渲染器',
    fps: '帧率',
    motion: '动效',
    theme: '主题',
    buildMode: '构建模式',
    contentMode: '内容模式',
    router: '路由',
    online: '在线',
    assets: '资源',
    // Analytics
    analyticsMode: '统计模式',
    pv: '页面浏览',
    uv: '独立访客',
    popularPage: '热门页面',
    dataSource: '数据源',
    // Buttons
    returnTop: '返回顶部',
    enterSite: '进入站点',
    // Values
    desktop: '桌面端',
    tablet: '平板',
    mobile: '移动端',
    supported: '支持',
    unsupported: '不支持',
    enabled: '已启用',
    reduced: '已减少',
    dark: '深色',
    light: '浅色',
    onlineStatus: '在线',
    offlineStatus: '离线',
    loaded: '已加载',
    partial: '部分加载',
    notConnected: '未接入',
    awaitingData: '等待数据',
    localSession: '本地会话',
    permissionRequired: '需要授权',
    standby: '待命',
    webglSupported: 'WebGL 可用',
    cssFallback: 'CSS 降级',
    staticPages: '静态页面',
    markdownJson: 'Markdown + JSON',
    angularRouter: 'Angular Router',
    ghPages: 'GitHub Pages',
    unsupportedLabel: '不支持',
    hourShort: '时',
    minShort: '分',
    secShort: '秒',
    telemetryText: '驾驶舱系统 · 全站就绪 · 等待指令',
    logInit: '驾驶舱初始化完成',
    logSignal: '会话信号已连接',
    logContentLoaded: '静态内容已加载',
    logAiOnline: 'AI 前线数据在线',
    logRendererStable: 'WebGL 渲染稳定',
    logNetRestored: '网络已恢复',
    logNetDisconnected: '网络已断开',
    logReturnTop: '返回顶部',
    logEnterSite: '进入站点',
  },
  en: {
    sectionIndex: '07',
    title: 'Cockpit Dashboard',
    subtitle: 'SpaceLab system control center',
    visitorSignal: 'Visitor Signal',
    sessionMetrics: 'Session Metrics',
    sitePulse: 'Site Pulse',
    contentSync: 'Content Sync',
    systemStatus: 'System Status',
    analyticsStatus: 'Analytics Status',
    commandLog: 'Command Log',
    localTime: 'Local Time',
    timezone: 'Timezone',
    language: 'Language',
    device: 'Device',
    viewport: 'Viewport',
    dpr: 'DPR',
    browser: 'Browser',
    os: 'OS',
    network: 'Network',
    connection: 'Connection',
    location: 'Location',
    weather: 'Weather',
    currentPage: 'Current Page',
    sessionTime: 'Session Time',
    scrollDepth: 'Scroll Depth',
    clickCount: 'Click Count',
    routeChanges: 'Route Changes',
    lastInteraction: 'Last Interaction',
    entryRoute: 'Entry Route',
    posts: 'Posts',
    projects: 'Projects',
    aiNews: 'AI News',
    gallery: 'Gallery',
    lastBuild: 'Last Build',
    aiSync: 'AI Sync',
    projectSync: 'Project Sync',
    postSync: 'Post Sync',
    source: 'Source',
    renderer: 'Renderer',
    fps: 'FPS',
    motion: 'Motion',
    theme: 'Theme',
    buildMode: 'Build Mode',
    contentMode: 'Content Mode',
    router: 'Router',
    online: 'Online',
    assets: 'Assets',
    analyticsMode: 'Analytics Mode',
    pv: 'PV',
    uv: 'UV',
    popularPage: 'Popular Page',
    dataSource: 'Data Source',
    returnTop: 'Return Top',
    enterSite: 'Enter Site',
    desktop: 'Desktop',
    tablet: 'Tablet',
    mobile: 'Mobile',
    supported: 'Supported',
    unsupported: 'Unsupported',
    enabled: 'Enabled',
    reduced: 'Reduced',
    dark: 'Dark',
    light: 'Light',
    onlineStatus: 'Online',
    offlineStatus: 'Offline',
    loaded: 'Loaded',
    partial: 'Partial',
    notConnected: 'Not connected',
    awaitingData: 'Awaiting data',
    localSession: 'Local Session',
    permissionRequired: 'Permission required',
    standby: 'Standby',
    webglSupported: 'WebGL OK',
    cssFallback: 'CSS Fallback',
    staticPages: 'Static Pages',
    markdownJson: 'Markdown + JSON',
    angularRouter: 'Angular Router',
    ghPages: 'GitHub Pages',
    unsupportedLabel: 'Unsupported',
    hourShort: 'h',
    minShort: 'm',
    secShort: 's',
    telemetryText: 'COCKPIT SYSTEMS · ALL STATIONS NOMINAL · READY FOR COMMAND',
    logInit: 'Cockpit initialized',
    logSignal: 'Signal connected',
    logContentLoaded: 'Static content loaded',
    logAiOnline: 'Frontline data online',
    logRendererStable: 'Renderer stable',
    logNetRestored: 'Network reconnected',
    logNetDisconnected: 'Network disconnected',
    logReturnTop: 'Returning to top',
    logEnterSite: 'Entering site',
  },
};

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
  imports: [ThreeCanvasComponent, HudFrameComponent, TelemetryBarComponent],
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

  private readonly lang = computed<Lang>(() => (this.i18n.locale() === 'zh-CN' ? 'zh' : 'en'));

  t(key: string): string {
    return TEXT[this.lang()][key] ?? TEXT['en'][key] ?? key;
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

  /* ── Site Pulse ─────────────────────────────────────────────────── */

  readonly postsCount = signal(POSTS.length);
  readonly projectsCount = signal(PROJECTS.length);
  readonly aiNewsCount = signal(AI_FRONTLINE_NEWS.length);
  readonly galleryCount = signal(GALLERY.length);
  readonly lastBuildTime = signal(this.formatDate(new Date()));

  /* ── Content Sync ───────────────────────────────────────────────── */

  readonly aiSyncTime = signal(this.formatSyncTime(AI_FRONTLINE_SOURCE.lastFetchedAt));
  readonly aiSourceName = signal(AI_FRONTLINE_SOURCE.name);

  /* ── System Status ──────────────────────────────────────────────── */

  readonly rendererType = signal('');
  readonly fps = signal('--');
  readonly motionPref = signal('');
  readonly currentTheme = signal('');
  readonly buildMode = signal('');
  readonly contentMode = signal('');
  readonly routerInfo = signal('');
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

    this.initVisitorInfo();
    this.initSystemStatus();
    this.initAnalytics();
    this.initCommandLog();
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
    this.rendererType.set(this.webglAvailable ? this.t('webglSupported') : this.t('cssFallback'));
    this.motionPref.set(
      matchMedia('(prefers-reduced-motion: reduce)').matches
        ? this.t('reduced')
        : this.t('enabled'),
    );
    this.currentTheme.set(
      document.documentElement.classList.contains('light-theme') ? this.t('light') : this.t('dark'),
    );
    this.buildMode.set(this.t('ghPages'));
    this.contentMode.set(this.t('markdownJson'));
    this.routerInfo.set(this.t('angularRouter'));
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

  private initCommandLog(): void {
    this.commandLog.set([]);
  }

  /* ── Timers ─────────────────────────────────────────────────────── */

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

    // Session time display
    this.sessionInterval = setInterval(() => {
      // Force change detection for session time
    }, 5000);
  }

  private _fpsRaf = 0;

  /* ── Event listeners ────────────────────────────────────────────── */

  private bindListeners(): void {
    // Click counter
    const clickHandler = () => {
      this.clicks++;
      this.clickCount.set(this.clicks);
      this.lastActivity = Date.now();
    };
    document.addEventListener('click', clickHandler);
    this.cleanupFns.push(() => document.removeEventListener('click', clickHandler));

    // Scroll depth (throttled via rAF)
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

    // Route changes
    const routerSub = this.router.events.subscribe(() => {
      this.routeCount++;
      this.routeChanges.set(this.routeCount);
      this.currentPage.set(this.router.url);
      this.lastActivity = Date.now();
    });
    this.cleanupFns.push(() => routerSub.unsubscribe());

    // Online / offline
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

    // Resize viewport
    const resizeHandler = () => {
      this.viewport.set(`${window.innerWidth}×${window.innerHeight}`);
    };
    window.addEventListener('resize', resizeHandler);
    this.cleanupFns.push(() => window.removeEventListener('resize', resizeHandler));

    // Keyboard interaction
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
    const zh = this.lang() === 'zh';
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
