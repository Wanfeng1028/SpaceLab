import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  OnDestroy,
  Output,
  EventEmitter,
  signal,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-launch-terminal-transition',
  templateUrl: './launch-terminal-transition.component.html',
  styleUrl: './launch-terminal-transition.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
})
export class LaunchTerminalTransitionComponent implements OnInit, OnDestroy {
  @Output() completed = new EventEmitter<void>();

  // State
  isActive = signal(false);
  currentStep = signal(0);
  showSystemReady = signal(false);
  progress = signal(0);
  reducedMotion = false;

  // Command sequence (desktop)
  private readonly desktopCommands = [
    { command: '$ boot spacelab --mode=orbit', outputs: ['[OK] WebGL renderer initialized'] },
    { command: '$ load content --static', outputs: ['[OK] Markdown posts indexed', '[OK] Project registry online'] },
    { command: '$ connect signal --visitor', outputs: ['[OK] Local environment linked', '[OK] Network channel stable'] },
    { command: '$ enter earth-observatory', outputs: ['[READY] Launch route calculated'] },
  ];

  // Command sequence (mobile)
  private readonly mobileCommands = [
    { command: '$ boot spacelab', outputs: ['[OK] Renderer ready'] },
    { command: '$ load content', outputs: ['[OK] Static layer online'] },
    { command: '$ enter orbit', outputs: ['[READY] Launch route calculated'] },
  ];

  // Current command list based on screen size
  private commands = this.desktopCommands;
  private stepTimers: any[] = [];
  private completionTimer: any = null;
  private progressInterval: any = null;

  ngOnInit(): void {
    // Check for reduced motion preference
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    // Check screen size for command selection
    this.checkScreenSize();
    
    // Start animation after a short delay
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
    // Allow user to skip animation by scrolling down
    if (event.deltaY > 50 && this.isActive() && !this.showSystemReady()) {
      this.skipToComplete();
    }
  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    // Allow user to skip with Enter or Space
    if ((event.key === 'Enter' || event.key === ' ') && this.isActive() && !this.showSystemReady()) {
      this.skipToComplete();
    }
  }

  private checkScreenSize(): void {
    const isMobile = window.innerWidth < 768;
    this.commands = isMobile ? this.mobileCommands : this.desktopCommands;
  }

  private startSequence(): void {
    if (this.reducedMotion) {
      // Skip animation for reduced motion
      this.skipToComplete();
      return;
    }

    // Start progress bar animation
    this.startProgressAnimation();

    // Schedule each command step
    let totalDelay = 0;
    this.commands.forEach((cmd, index) => {
      const delay = totalDelay;
      this.stepTimers.push(
        setTimeout(() => {
          this.currentStep.set(index);
        }, delay)
      );
      // Approx 400ms per command + outputs
      totalDelay += 400;
    });

    // Schedule completion
    const completionDelay = totalDelay + 400;
    this.completionTimer = setTimeout(() => {
      this.showSystemReady.set(true);
      // Wait a bit then emit completion
      setTimeout(() => {
        this.completed.emit();
      }, 600);
    }, completionDelay);
  }

  private startProgressAnimation(): void {
    const totalSteps = this.commands.length;
    const stepDuration = 400; // ms per command
    const totalDuration = totalSteps * stepDuration + 1000; // extra time for SYSTEM READY
    
    let startTime = Date.now();
    
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
    this.currentStep.set(this.commands.length - 1);
    this.showSystemReady.set(true);
    this.progress.set(100);
    
    setTimeout(() => {
      this.completed.emit();
    }, 600);
  }

  private clearTimers(): void {
    this.stepTimers.forEach(timer => clearTimeout(timer));
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

  // Helper to get current commands to display
  getVisibleCommands(): any[] {
    const step = this.currentStep();
    return this.commands.slice(0, step + 1);
  }

  // Check if a command is currently typing
  isTyping(index: number): boolean {
    return index === this.currentStep() && !this.showSystemReady();
  }

  // Get output lines for a command
  getOutputs(cmd: any): string[] {
    return cmd.outputs || [];
  }
}