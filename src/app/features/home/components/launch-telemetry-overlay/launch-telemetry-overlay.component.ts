import { Component, ChangeDetectionStrategy, OnDestroy, OnInit, signal, HostListener } from '@angular/core';

interface TelemetryPhase {
  label: string;
  active: boolean;
}

interface GaugeTick {
  angle: number;
  major: boolean;
}

interface EngineDot {
  lit: boolean;
}

@Component({
  selector: 'app-launch-telemetry-overlay',
  templateUrl: './launch-telemetry-overlay.component.html',
  styleUrl: './launch-telemetry-overlay.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LaunchTelemetryOverlayComponent implements OnInit, OnDestroy {
  readonly Math = Math;

  readonly telemetry = {
    speed: '0',
    speedUnit: 'KM/H',
    altitude: '0.1',
    altitudeUnit: 'KM',
    countdown: 'T- 00:00:01',
    mission: 'NROL-172',
    gForce: '1.0',
    author: '@SpaceX',
  };

  readonly phases: TelemetryPhase[] = [
    { label: 'STARTUP', active: false },
    { label: 'LIFTOFF', active: true },
    { label: 'MAX Q', active: false },
    { label: 'STAGE SEP', active: false },
    { label: 'FAIRING', active: false },
  ];

  readonly activeIndex = this.phases.findIndex(p => p.active);

  /** 11 条刻度线角度（从弧线左端到右端均匀分布） */
  readonly ticks: GaugeTick[] = Array.from({ length: 11 }, (_, i) => ({
    angle: (i + 1) * (Math.PI / 12),
    major: i % 2 === 0,
  }));

  /** 3×3 发动机阵列，前 3 个点亮 */
  readonly engineDots: EngineDot[] = Array.from({ length: 9 }, (_, i) => ({
    lit: i < 3,
  }));

  /** 实时在线状态与延迟数据 */
  readonly isOnline = signal<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  readonly rtt = signal<number>(50);

  private isPinging = false;
  private pingCounter = 0;
  private timerId: ReturnType<typeof setInterval> | null = null;

  @HostListener('window:online')
  onOnline(): void {
    this.isOnline.set(true);
    this.updateNetworkStatus(true);
  }

  @HostListener('window:offline')
  onOffline(): void {
    this.isOnline.set(false);
  }

  /** 当前时间，每秒刷新 */
  readonly currentTime = signal(new Date());

  ngOnInit(): void {
    this.updateNetworkStatus(true);
    this.timerId = setInterval(() => {
      this.currentTime.set(new Date());
      this.pingCounter++;
      // 每 3 秒执行一次实际的 HTTP Latency 测量，其余时间更新 navigator 状态
      if (this.pingCounter >= 3) {
        this.pingCounter = 0;
        this.updateNetworkStatus(true);
      } else {
        this.updateNetworkStatus(false);
      }
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.timerId !== null) {
      clearInterval(this.timerId);
    }
  }

  /** 格式化为 yyyy-MM-dd HH:mm:ss */
  get formattedTime(): string {
    return this.formatDate(this.currentTime());
  }

  get formattedCurrentTime(): string {
    return this.formattedTime;
  }

  get phaseProgress(): number {
    const idx = this.activeIndex;
    const total = this.phases.length - 1;
    return total > 0 ? idx / total : 0;
  }

  private formatDate(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  /** 获取实际的网络延迟与在线状况 */
  private async updateNetworkStatus(forcePing = false): Promise<void> {
    if (typeof navigator === 'undefined') return;

    const online = navigator.onLine;
    this.isOnline.set(online);

    if (!online) return;

    if (forcePing && !this.isPinging) {
      this.isPinging = true;
      const start = performance.now();
      try {
        // 创建一个带有超时中止机制的 Fetch 请求
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);

        // 使用 HEAD 方法对网站资源进行无缓存的极轻量请求，精准测出网络往返延迟
        await fetch('/favicon.ico?_t=' + Date.now(), {
          method: 'HEAD',
          signal: controller.signal,
          cache: 'no-store'
        });
        clearTimeout(timeoutId);

        const latency = Math.round(performance.now() - start);
        this.isOnline.set(true);
        this.rtt.set(latency);
      } catch (e) {
        // 如果 favicon.ico 不存在或由于开发服务器原因报错，尝试直接请求根路径 /
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 2000);
          await fetch('/?_t=' + Date.now(), {
            method: 'HEAD',
            signal: controller.signal,
            cache: 'no-store'
          });
          clearTimeout(timeoutId);

          const latency = Math.round(performance.now() - start);
          this.isOnline.set(true);
          this.rtt.set(latency);
        } catch (err) {
          // 如果全部请求失败，则采用 Connection API 或拟真波动
          this.fallbackLatency();
        }
      } finally {
        this.isPinging = false;
      }
    } else if (!forcePing) {
      // 快速轮询时，如果有 Connection API 则更新，否则仅维持原状
      const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
      if (conn && typeof conn.rtt === 'number') {
        this.rtt.set(conn.rtt || 50);
      }
    }
  }

  private fallbackLatency(): void {
    if (typeof navigator === 'undefined') return;
    const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    if (conn && typeof conn.rtt === 'number') {
      this.rtt.set(conn.rtt || 50);
    } else {
      // 在本地开发或浏览器不支持该 API 时，模拟拟真的 35ms - 75ms 航天浮动网络数据
      this.rtt.set(Math.round(35 + Math.random() * 40));
    }
  }
}
