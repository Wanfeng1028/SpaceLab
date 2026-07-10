import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  OnDestroy,
  inject,
  signal,
  effect,
  HostListener,
} from '@angular/core';
import { Router } from '@angular/router';
import { I18nService } from '../../core/services/i18n.service';
import { LenisScrollService } from '../../core/services/lenis-scroll.service';
import { LaunchTelemetryOverlayComponent } from './components/launch-telemetry-overlay/launch-telemetry-overlay.component';
import { MacTerminalModalComponent } from '../../shared/components/mac-terminal-modal/mac-terminal-modal.component';
import { CockpitDashboardSection } from './components/cockpit-dashboard/cockpit-dashboard.component';
import { HomeNextOrbitCardComponent } from './components/home-next-orbit-card/home-next-orbit-card.component';
import { LaunchTerminalTransitionComponent } from './components/launch-terminal-transition/launch-terminal-transition.component';
import { VideoWallpaperComponent } from './components/video-wallpaper/video-wallpaper.component';

@Component({
  selector: 'app-home',
  templateUrl: './home.html',
  styleUrl: './home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    VideoWallpaperComponent,
    LaunchTelemetryOverlayComponent,
    MacTerminalModalComponent,
    CockpitDashboardSection,
    HomeNextOrbitCardComponent,
    LaunchTerminalTransitionComponent,
  ],
})
export class HomeComponent implements OnInit, OnDestroy {
  filmNoise = signal<boolean>(true);

  // 亮度自适应按钮状态
  isBright = signal<boolean>(false);
  showContactModal = signal<boolean>(false);

  // Launch Terminal Transition 状态
  isLaunchTransitionActive = signal<boolean>(false);
  launchCompleted = signal<boolean>(false);
  isHeroDimmed = signal<boolean>(false);

  // Live scrolling sci-fi diagnostic terminal logs
  telemetryLogs = signal<string[]>([]);
  private logTimer: any = null;
  private combinedTimer: any = null;
  private possibleLogs = [
    '[SYS] Rayleigh coefficient aligned: 3.81',
    '[NAV] Orbiting solar trajectory stable',
    '[ENV] Mie dust concentration: 21.0ppm',
    '[HUD] Launch telemetry sync: 100% OK',
    '[SHD] Atmospheric pressure: 1.05e-5 bar',
    '[CLK] Time warp offset active: +0.00s',
    '[NET] Quantum uplink active (2.4Gbps)',
    '[PWR] Star-core reactor temp: NOMINAL',
    '[SYS] WebGL physical light field ready',
    '[NAV] Gravity assist coefficient: 1.0G',
    '[ENV] Solar wind density: 420 particles/cm³',
    '[HUD] G-force compensator calibrated',
  ];

  private router = inject(Router);
  private i18n = inject(I18nService);
  private lenis = inject(LenisScrollService);

  // Typewriter properties
  typedText = signal<string>('');
  audioCtxSuspended = signal<boolean>(true);
  soundEnabled = signal<boolean>(false); // 打字机音效开关（默认关闭）

  private fullText = this.i18n.t('home.typewriter');
  private typingIndex = 0;
  private typingTimer: any = null;
  private initDelayTimer: any = null;
  private bellTimer: any = null;
  private restartTimer: any = null;
  private destroyed = false;

  // Web Audio Context for synthesized sound effects
  private audioCtx: AudioContext | null = null;

  constructor() {
    // Restart typewriter when language changes
    effect(() => {
      const _locale = this.i18n.locale();
      if (!this.destroyed) {
        this.fullText = this.i18n.t('home.typewriter');
        clearTimeout(this.typingTimer);
        clearTimeout(this.restartTimer);
        this.typedText.set(this.fullText);
        this.typingIndex = this.fullText.length;
      }
    });
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.resumeAudioContext();
  }

  @HostListener('document:keydown')
  onDocumentKeydown(): void {
    this.resumeAudioContext();
  }

  ngOnInit(): void {
    console.log('[Home] mounted');
    // 重置所有临时UI状态
    this.isLaunchTransitionActive.set(false);
    this.launchCompleted.set(false);
    this.isHeroDimmed.set(false);
    // 清理可能残留的 body/html class
    this.cleanupBodyClasses();
    // 直接显示完整文本
    this.typedText.set(this.fullText);
    // 延迟2秒后启动打字机循环（确保音频上下文可能需要用户交互）
    this.initDelayTimer = setTimeout(() => {
      if (!this.destroyed && this.audioCtxSuspended()) {
        this.startTypewriter();
      }
    }, 2000);
    this.startCombinedTimer();
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    clearTimeout(this.typingTimer);
    clearTimeout(this.initDelayTimer);
    clearTimeout(this.bellTimer);
    clearTimeout(this.restartTimer);
    if (this.combinedTimer) {
      clearInterval(this.combinedTimer);
    }
    if (this.logTimer) {
      clearInterval(this.logTimer);
    }
    if (this.audioCtx) {
      this.audioCtx.close();
    }
  }

  private cleanupBodyClasses(): void {
    const body = document.body;
    const html = document.documentElement;
    const classesToRemove = [
      'modal-open',
      'menu-open',
      'launching',
      'is-launching',
      'is-transitioning',
      'is-loading',
      'page-hidden',
    ];
    classesToRemove.forEach((cls) => {
      body.classList.remove(cls);
      html.classList.remove(cls);
    });
    // 恢复滚动
    body.style.overflow = '';
    html.style.overflow = '';
  }

  t(key: string): string {
    return this.i18n.t(key);
  }

  onEnter(): void {
    // 启动 Launch Terminal Transition
    if (this.isLaunchTransitionActive()) {
      // 如果正在播放，重新启动
      this.isLaunchTransitionActive.set(false);
      setTimeout(() => {
        this.isLaunchTransitionActive.set(true);
        this.launchCompleted.set(false);
      }, 50);
      return;
    }
    this.isLaunchTransitionActive.set(true);
    this.launchCompleted.set(false);
  }

  // Launch Terminal Transition 完成回调
  onLaunchComplete(): void {
    this.launchCompleted.set(true);

    setTimeout(() => {
      this.isLaunchTransitionActive.set(false);
      this.scrollToCockpit();
    }, 600);
  }

  // 滚动到 Cockpit Dashboard
  private scrollToCockpit(): void {
    const target = document.getElementById('section-cockpit');
    if (target) {
      // 使用 Lenis 平滑滚动
      this.lenis.scrollTo(target.offsetTop, { immediate: false });
    }
  }

  onContact(): void {
    this.showContactModal.set(true);
  }

  private startTypewriter(): void {
    this.typedText.set('');
    this.typingIndex = 0;
    this.typeNextChar();
  }

  private typeNextChar(): void {
    if (this.destroyed) return;
    if (this.typingIndex < this.fullText.length) {
      const char = this.fullText[this.typingIndex];
      this.typedText.update((val) => val + char);
      this.typingIndex++;

      // Play mechanical key sound
      this.playKeySound();

      // Random typing variation to simulate human-like typing speed
      const baseDelay = 180;
      const variation = Math.random() * 80;
      this.typingTimer = setTimeout(() => this.typeNextChar(), baseDelay + variation);
    } else {
      // Reached the end of line, ring the typewriter bell!
      this.bellTimer = setTimeout(() => this.playBellSound(), 100);
      // 等待2秒后重新开始打字（循环）
      this.restartTimer = setTimeout(() => {
        if (this.destroyed) return;
        this.typedText.set('');
        this.typingIndex = 0;
        this.typeNextChar();
      }, 2000);
    }
  }

  private initAudioContext(): void {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  private resumeAudioContext(): void {
    this.initAudioContext();
    if (this.audioCtx) {
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().then(() => {
          this.audioCtxSuspended.set(false);
          // 用户首次交互后启动打字机（确保音效同步）
          if (!this.typingTimer && this.typingIndex === 0) {
            this.startTypewriter();
          }
        });
      } else {
        this.audioCtxSuspended.set(false);
        if (!this.typingTimer && this.typingIndex === 0) {
          this.startTypewriter();
        }
      }
    }
  }

  private playKeySound(): void {
    if (!this.soundEnabled()) return; // 如果音效关闭，则直接返回
    try {
      this.initAudioContext();
      if (!this.audioCtx || this.audioCtx.state === 'suspended') return;

      const now = this.audioCtx.currentTime;

      // 1. Triangle mechanical key mechanical thud (low-frequency resonance)
      const thudOsc = this.audioCtx.createOscillator();
      const thudGain = this.audioCtx.createGain();
      thudOsc.type = 'triangle';
      thudOsc.frequency.setValueAtTime(100 + Math.random() * 60, now);
      thudOsc.frequency.exponentialRampToValueAtTime(10, now + 0.04);
      thudGain.gain.setValueAtTime(0.3, now);
      thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      thudOsc.connect(thudGain);
      thudGain.connect(this.audioCtx.destination);
      thudOsc.start();
      thudOsc.stop(now + 0.045);

      // 2. Sine metallic clack (high-frequency transient)
      const clickOsc = this.audioCtx.createOscillator();
      const clickGain = this.audioCtx.createGain();
      clickOsc.type = 'sine';
      clickOsc.frequency.setValueAtTime(1500 + Math.random() * 300, now);
      clickOsc.frequency.exponentialRampToValueAtTime(300, now + 0.015);
      clickGain.gain.setValueAtTime(0.18, now);
      clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.015);

      clickOsc.connect(clickGain);
      clickGain.connect(this.audioCtx.destination);
      clickOsc.start();
      clickOsc.stop(now + 0.02);
    } catch (e) {
      // Ignore Web Audio errors
    }
  }

  private playBellSound(): void {
    if (!this.soundEnabled()) return; // 如果音效关闭，则直接返回
    try {
      this.initAudioContext();
      if (!this.audioCtx || this.audioCtx.state === 'suspended') return;

      const now = this.audioCtx.currentTime;

      const bellOsc = this.audioCtx.createOscillator();
      const bellGain = this.audioCtx.createGain();

      bellOsc.type = 'sine';
      // Mechanical bell chime frequency (2000Hz)
      bellOsc.frequency.setValueAtTime(2000, now);

      bellGain.gain.setValueAtTime(0.2, now);
      bellGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      bellOsc.connect(bellGain);
      bellGain.connect(this.audioCtx.destination);

      bellOsc.start();
      bellOsc.stop(now + 0.6);
    } catch (e) {
      // Ignore Web Audio errors
    }
  }

  private startCombinedTimer(): void {
    // Initial logs
    this.telemetryLogs.set([
      '[SYS] System initializing...',
      '[SYS] Rayleigh scattering model: OK',
      '[NAV] Aligning solar sensor arrays...',
      '[HUD] Diagnostic telemetry online',
    ]);

    this.combinedTimer = setInterval(() => {
      const current = this.telemetryLogs();
      const nextLog = this.possibleLogs[Math.floor(Math.random() * this.possibleLogs.length)];
      let updated = [...current, nextLog];
      if (updated.length > 5) {
        updated.shift();
      }
      this.telemetryLogs.set(updated);
    }, 4500);
  }

  // (generateMatrixChars removed — no longer needed)
}
