import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  OnDestroy,
  Output,
  EventEmitter,
  signal,
  HostListener,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '../../../../core/services/i18n.service';

interface CommandDef {
  commandKey: string;
  outputKeys: string[];
}

const DESKTOP_COMMANDS: CommandDef[] = [
  { commandKey: 'launchTerminal.bootCmd', outputKeys: ['launchTerminal.bootOutput'] },
  {
    commandKey: 'launchTerminal.loadCmd',
    outputKeys: ['launchTerminal.loadOutput1', 'launchTerminal.loadOutput2'],
  },
  {
    commandKey: 'launchTerminal.connectCmd',
    outputKeys: ['launchTerminal.connectOutput1', 'launchTerminal.connectOutput2'],
  },
  { commandKey: 'launchTerminal.enterCmd', outputKeys: ['launchTerminal.enterOutput'] },
];

const MOBILE_COMMANDS: CommandDef[] = [
  { commandKey: 'launchTerminal.bootCmdShort', outputKeys: ['launchTerminal.bootOutputShort'] },
  { commandKey: 'launchTerminal.loadCmdShort', outputKeys: ['launchTerminal.loadOutputShort'] },
  { commandKey: 'launchTerminal.enterCmdShort', outputKeys: ['launchTerminal.enterOutputShort'] },
];

@Component({
  selector: 'app-launch-terminal-transition',
  templateUrl: './launch-terminal-transition.component.html',
  styleUrl: './launch-terminal-transition.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
})
export class LaunchTerminalTransitionComponent implements OnInit, OnDestroy {
  @Output() completed = new EventEmitter<void>();

  private readonly i18n = inject(I18nService);

  t(key: string): string {
    return this.i18n.t(key);
  }

  isActive = signal(false);
  currentStep = signal(0);
  showSystemReady = signal(false);
  progress = signal(0);
  reducedMotion = false;

  private commandDefs = DESKTOP_COMMANDS;
  private stepTimers: any[] = [];
  private completionTimer: any = null;
  private progressInterval: any = null;

  ngOnInit(): void {
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.checkScreenSize();

    setTimeout(() => {
      this.isActive.set(true);
      this.startSequence();
    }, 100);
  }

  ngOnDestroy(): void {
    this.clearTimers();
  }

  @HostListener('window:resize')
  onResize(): void {
    this.checkScreenSize();
  }

  @HostListener('document:wheel', ['$event'])
  onScroll(event: WheelEvent): void {
    if (event.deltaY > 50 && this.isActive() && !this.showSystemReady()) {
      this.skipToComplete();
    }
  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (
      (event.key === 'Enter' || event.key === ' ') &&
      this.isActive() &&
      !this.showSystemReady()
    ) {
      this.skipToComplete();
    }
  }

  private checkScreenSize(): void {
    const isMobile = window.innerWidth < 768;
    this.commandDefs = isMobile ? MOBILE_COMMANDS : DESKTOP_COMMANDS;
  }

  private startSequence(): void {
    if (this.reducedMotion) {
      this.skipToComplete();
      return;
    }

    this.startProgressAnimation();

    let totalDelay = 0;
    this.commandDefs.forEach((_, index) => {
      const delay = totalDelay;
      this.stepTimers.push(
        setTimeout(() => {
          this.currentStep.set(index);
        }, delay),
      );
      totalDelay += 400;
    });

    const completionDelay = totalDelay + 400;
    this.completionTimer = setTimeout(() => {
      this.showSystemReady.set(true);
      setTimeout(() => {
        this.completed.emit();
      }, 600);
    }, completionDelay);
  }

  private startProgressAnimation(): void {
    const totalSteps = this.commandDefs.length;
    const stepDuration = 400;
    const totalDuration = totalSteps * stepDuration + 1000;

    const startTime = Date.now();

    this.progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progressPercent = Math.min((elapsed / totalDuration) * 100, 100);
      this.progress.set(progressPercent);

      if (progressPercent >= 100) {
        clearInterval(this.progressInterval);
      }
    }, 50);
  }

  private skipToComplete(): void {
    this.clearTimers();
    this.currentStep.set(this.commandDefs.length - 1);
    this.showSystemReady.set(true);
    this.progress.set(100);

    setTimeout(() => {
      this.completed.emit();
    }, 600);
  }

  private clearTimers(): void {
    this.stepTimers.forEach((timer) => clearTimeout(timer));
    this.stepTimers = [];

    if (this.completionTimer) {
      clearTimeout(this.completionTimer);
      this.completionTimer = null;
    }

    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  }

  getVisibleCommands(): CommandDef[] {
    const step = this.currentStep();
    return this.commandDefs.slice(0, step + 1);
  }

  isTyping(index: number): boolean {
    return index === this.currentStep() && !this.showSystemReady();
  }

  getCommandText(def: CommandDef): string {
    return this.t(def.commandKey);
  }

  getOutputText(key: string): string {
    return this.t(key);
  }
}
