import { Component, ChangeDetectionStrategy } from '@angular/core';

interface TelemetryPhase {
  label: string;
  active: boolean;
}

@Component({
  selector: 'app-launch-telemetry-overlay',
  templateUrl: './launch-telemetry-overlay.component.html',
  styleUrl: './launch-telemetry-overlay.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LaunchTelemetryOverlayComponent {
  readonly Math = Math;

  readonly telemetry = {
    speed: '0',
    speedUnit: 'KM/H',
    altitude: '0.1',
    altitudeUnit: 'KM',
    countdown: 'T- 00:00:01',
    mission: 'NROL-172',
    gForce: '1.0',
    date: '5月12日',
    author: '@SpaceX',
    description:
      '北京时间2026年5月12日10:14，SpaceX猎鹰9号火箭从美国加利福尼亚州范登堡太空军基地4号航天发射中心SLC-4E工作发射，将NROL-172任务卫星送入近地轨道。',
  };

  readonly phases: TelemetryPhase[] = [
    { label: 'STARTUP', active: false },
    { label: 'LIFTOFF', active: true },
    { label: 'MAX Q', active: false },
    { label: 'STAGE SEP', active: false },
    { label: 'FAIRING', active: false },
  ];

  readonly activeIndex = this.phases.findIndex(p => p.active);
  readonly tickCount = 24;

  get phaseProgress(): number {
    const idx = this.activeIndex;
    const total = this.phases.length - 1;
    return total > 0 ? idx / total : 0;
  }
}
