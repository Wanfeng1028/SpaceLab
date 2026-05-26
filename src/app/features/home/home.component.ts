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
import { ThreeCanvasComponent } from '../../three/components/three-canvas/three-canvas.component';
import { HeroLightFieldScene } from '../../three/scenes/hero-particles.scene';
import { LaunchTelemetryOverlayComponent } from './components/launch-telemetry-overlay/launch-telemetry-overlay.component';

@Component({
  selector: 'app-home',
  templateUrl: './home.html',
  styleUrl: './home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ThreeCanvasComponent, LaunchTelemetryOverlayComponent],
})
export class HomeComponent implements OnInit, OnDestroy {
  private activeScene: HeroLightFieldScene | null = null;

  sceneFactory = (canvas: HTMLCanvasElement) => {
    this.activeScene = new HeroLightFieldScene(canvas);
    return this.activeScene;
  };

  // WebGL Customization properties (inspired by uiverse.io high-tech controls)
  coronaIntensity = signal<number>(2.8);
  orbitalSpeed = signal<number>(1.05);
  activePreset = signal<'ECLIPSE' | 'PULSAR' | 'AURORA'>('ECLIPSE');
  filmNoise = signal<boolean>(true);

  // Live scrolling sci-fi diagnostic terminal logs
  telemetryLogs = signal<string[]>([]);
  private logTimer: any = null;
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
    '[HUD] G-force compensator calibrated'
  ];

  // Typewriter properties
  typedText = signal<string>('');
  audioCtxSuspended = signal<boolean>(true);

  private fullText = 'Life is coding...';
  private typingIndex = 0;
  private typingTimer: any = null;

  // Web Audio Context for synthesized sound effects
  private audioCtx: AudioContext | null = null;

  private router = inject(Router);
  private i18n = inject(I18nService);

  constructor() {
    effect(() => {
      const scene = this.activeScene;
      if (!scene) return;

      scene.updateIntensity(this.coronaIntensity());
      scene.updateRotationSpeed(this.orbitalSpeed());

      const preset = this.activePreset();
      if (preset === 'ECLIPSE') {
        scene.updateTints('#b2a8ff', '#fcff42');
      } else if (preset === 'PULSAR') {
        scene.updateTints('#00f0ff', '#ff007b');
      } else if (preset === 'AURORA') {
        scene.updateTints('#00ff87', '#60efe0');
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
    this.i18n.loadTranslations('zh-CN');
    this.startTypewriter();
    this.startTelemetryLogs();
  }

  ngOnDestroy(): void {
    if (this.typingTimer) {
      clearTimeout(this.typingTimer);
    }
    if (this.logTimer) {
      clearInterval(this.logTimer);
    }
    if (this.audioCtx) {
      this.audioCtx.close();
    }
  }

  t(key: string): string {
    return this.i18n.t(key);
  }

  onEnter(): void {
    this.router.navigate(['/projects']);
  }

  onContact(): void {
    window.location.href = 'mailto:hello@spacelab.dev?subject=Hi Gruev!';
  }

  private startTypewriter(): void {
    this.typedText.set('');
    this.typingIndex = 0;
    this.typeNextChar();
  }

  private typeNextChar(): void {
    if (this.typingIndex < this.fullText.length) {
      const char = this.fullText[this.typingIndex];
      this.typedText.update(val => val + char);
      this.typingIndex++;

      // Play mechanical key sound
      this.playKeySound();

      // Random typing variation to simulate human-like typing speed
      const baseDelay = 180;
      const variation = Math.random() * 80;
      this.typingTimer = setTimeout(() => this.typeNextChar(), baseDelay + variation);
    } else {
      // Reached the end of line, ring the typewriter bell!
      setTimeout(() => this.playBellSound(), 100);
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
        });
      } else {
        this.audioCtxSuspended.set(false);
      }
    }
  }

  private playKeySound(): void {
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
      thudGain.gain.setValueAtTime(0.2, now);
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
      clickGain.gain.setValueAtTime(0.12, now);
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
    try {
      this.initAudioContext();
      if (!this.audioCtx || this.audioCtx.state === 'suspended') return;

      const now = this.audioCtx.currentTime;

      const bellOsc = this.audioCtx.createOscillator();
      const bellGain = this.audioCtx.createGain();

      bellOsc.type = 'sine';
      // Mechanical bell chime frequency (2000Hz)
      bellOsc.frequency.setValueAtTime(2000, now);

      bellGain.gain.setValueAtTime(0.15, now);
      bellGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      bellOsc.connect(bellGain);
      bellGain.connect(this.audioCtx.destination);

      bellOsc.start();
      bellOsc.stop(now + 0.6);
    } catch (e) {
      // Ignore Web Audio errors
    }
  }

  private startTelemetryLogs(): void {
    // Initial logs
    this.telemetryLogs.set([
      '[SYS] System initializing...',
      '[SYS] Rayleigh scattering model: OK',
      '[NAV] Aligning solar sensor arrays...',
      '[HUD] Diagnostic telemetry online'
    ]);

    // Periodically add new scrolling log
    this.logTimer = setInterval(() => {
      const current = this.telemetryLogs();
      const nextLog = this.possibleLogs[Math.floor(Math.random() * this.possibleLogs.length)];

      let updated = [...current, nextLog];
      if (updated.length > 5) {
        updated.shift(); // Keep maximum 5 logs to avoid scrolling overflow
      }
      this.telemetryLogs.set(updated);
    }, 4500);
  }
}
