import { Component, ChangeDetectionStrategy, OnDestroy, OnInit, signal } from '@angular/core';

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

  /** 当前时间，每秒刷新 */
  readonly currentTime = signal(new Date());

  private timerId: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    this.timerId = setInterval(() => {
      this.currentTime.set(new Date());
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
}
