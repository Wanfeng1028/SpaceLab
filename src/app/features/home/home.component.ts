import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  OnDestroy,
  inject,
  signal,
  HostListener,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { I18nService } from '../../core/services/i18n.service';
import { ThreeCanvasComponent } from '../../three/components/three-canvas/three-canvas.component';
import { HeroLightFieldScene } from '../../three/scenes/hero-particles.scene';
import { LaunchTelemetryOverlayComponent } from './components/launch-telemetry-overlay/launch-telemetry-overlay.component';

@Component({
  selector: 'app-home',
  templateUrl: './home.html',
  styleUrl: './home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, ThreeCanvasComponent, LaunchTelemetryOverlayComponent],
})
export class HomeComponent implements OnInit, OnDestroy {
  sceneFactory = (canvas: HTMLCanvasElement) => new HeroLightFieldScene(canvas);

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
  }

  ngOnDestroy(): void {
    if (this.typingTimer) {
      clearTimeout(this.typingTimer);
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
}
