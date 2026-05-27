import {
  Component,
  ChangeDetectionStrategy,
  signal,
  HostListener,
  OnInit,
  OnDestroy,
  ElementRef,
  inject,
  computed,
} from '@angular/core';
import { ThreeCanvasComponent } from '../../../../three/components/three-canvas/three-canvas.component';
import { HudFrameComponent } from '../../../../shared/components/hud/hud-frame.component';
import { HudMetricComponent } from '../../../../shared/components/hud/hud-metric.component';
import { TelemetryBarComponent } from '../../../../shared/components/hud/telemetry-bar.component';
import { CockpitDashboardScene } from '../../../../three/scenes/cockpit-dashboard.scene';

interface LogEntry {
  time: string;
  message: string;
  type: 'system' | 'visitor' | 'webgl' | 'nav';
}

@Component({
  selector: 'app-cockpit-dashboard',
  templateUrl: './cockpit-dashboard.component.html',
  styleUrl: './cockpit-dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ThreeCanvasComponent,
    HudFrameComponent,
    HudMetricComponent,
    TelemetryBarComponent,
  ],
})
export class CockpitDashboardSection implements OnInit, OnDestroy {
  private readonly el = inject(ElementRef<HTMLElement>);
  private scene: CockpitDashboardScene | null = null;

  readonly telemetryText = signal('COCKPIT DASHBOARD // ONLINE');

  // Visitor info (would be detected in real app)
  readonly visitorInfo = signal({
    location: 'Auto detect',
    weather: 'Auto detect',
    localTime: this.formatCurrentTime(),
    device: this.detectDevice(),
    network: navigator.onLine ? 'Online' : 'Offline',
  });

  // System info
  readonly systemInfo = signal({
    renderer: 'WebGL',
    frameRate: '60 FPS',
    motion: 'Enabled',
    theme: 'Dark Orbit',
    language: '中文 / EN',
  });

  // Command log
  readonly commandLog = signal<LogEntry[]>([
    { time: this.formatTime(), message: 'Cockpit initialized', type: 'system' },
    { time: this.formatTime(), message: 'Signal connected', type: 'visitor' },
    { time: this.formatTime(), message: 'Renderer stable', type: 'webgl' },
    { time: this.formatTime(), message: 'Return route calculated', type: 'nav' },
  ]);

  readonly cockpitFactory = (canvas: HTMLCanvasElement) => {
    this.scene = new CockpitDashboardScene(canvas);
    return this.scene;
  };

  ngOnInit(): void {
    this.telemetryText.set('COCKPIT DASHBOARD // ACTIVE');

    // Update time periodically
    const timeInterval = setInterval(() => {
      this.visitorInfo.update(info => ({
        ...info,
        localTime: this.formatCurrentTime(),
      }));
    }, 1000);

    // Monitor online status
    const handleOnline = () => {
      this.visitorInfo.update(info => ({ ...info, network: 'Online' }));
      this.addLogEntry('Network reconnected', 'visitor');
    };
    const handleOffline = () => {
      this.visitorInfo.update(info => ({ ...info, network: 'Offline' }));
      this.addLogEntry('Network disconnected', 'visitor');
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
  }

  ngOnDestroy(): void {
    this.scene = null;
  }

  @HostListener('mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    if (!this.scene) return;
    const rect = this.el.nativeElement.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.scene.updateMouse(x, y);
  }

  onReturnTop(): void {
    this.addLogEntry('Returning to top...', 'nav');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  onRestartOrbit(): void {
    this.addLogEntry('Restarting orbit sequence...', 'system');
    // Trigger restart animation (would communicate with parent)
  }

  onEnterSite(): void {
    this.addLogEntry('Entering site...', 'nav');
    // Navigate to main site
  }

  private addLogEntry(message: string, type: LogEntry['type']): void {
    const entry: LogEntry = {
      time: this.formatTime(),
      message,
      type,
    };
    this.commandLog.update(log => [...log.slice(-4), entry]);
  }

  private formatCurrentTime(): string {
    const now = new Date();
    return now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  }

  private formatTime(): string {
    const now = new Date();
    return now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  private detectDevice(): string {
    const ua = navigator.userAgent;
    if (/Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
      return 'Mobile';
    }
    return 'Desktop';
  }
}
