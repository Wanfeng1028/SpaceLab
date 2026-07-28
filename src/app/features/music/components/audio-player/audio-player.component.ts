import {
  Component,
  ChangeDetectionStrategy,
  inject,
  viewChild,
  ElementRef,
  AfterViewInit,
  OnDestroy,
  computed,
  signal,
} from '@angular/core';
import { MediaPlaybackService } from '../../services/media-playback.service';

@Component({
  selector: 'app-audio-player',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <audio #audioElement preload="metadata"></audio>

    <div class="deck">
      <!-- 唱片舞台 -->
      <div class="turntable">
        <div
          class="vinyl"
          [style.animation-play-state]="svc.isPlaying() ? 'running' : 'paused'"
        >
          <div
            class="label"
            [style.background]="labelGradient()"
          >
            <span class="label__brand">MEDLEY</span>
            <span class="label__series">{{ defaultTitle() }}</span>
          </div>
          <span class="label__hole"></span>
        </div>
      </div>

      <!-- 徽章 -->
      <span class="badge">
        <span class="badge__dot"></span>
        <span class="badge__text">NOW PLAYING · {{ trackNumber() }}</span>
      </span>

      <!-- 标题区 -->
      <div class="meta">
        <h2 class="meta__title">{{ svc.currentTrack()?.title || defaultTitle() }}</h2>
        <div class="meta__sub">
          <span>{{ svc.currentTrack()?.subtitle || defaultSubtitle() }}</span>
          <span class="sep"></span>
          <span class="meta__dur">{{ svc.currentTrack()?.duration || '--:--' }}</span>
        </div>
      </div>

      @if (!svc.currentTrack()) {
        <p class="deck__hint">选择一首曲目开始播放</p>
      }
    </div>
  `,
  styles: [
    `
      /* 让父级 grid 撑满可用高度 */
      :host {
        display: block;
        min-width: 0;
        min-height: 0;
        height: 100%;
      }

      .deck {
        height: 100%;
        min-height: 0;
        display: grid;
        grid-template-rows: 1fr auto auto;
        justify-items: center;
        align-content: center;
        gap: clamp(14px, 1.8vh, 22px);
        padding: clamp(20px, 3vh, 40px) clamp(20px, 4vw, 64px);
        background:
          linear-gradient(
            145deg,
            rgba(216, 238, 255, 0.46),
            rgba(178, 160, 255, 0.12)
          );
      }

      .deck__hint {
        margin: 0;
        font-size: 12.5px;
        letter-spacing: 0.1em;
        color: rgba(18, 32, 48, 0.5);
      }

      /* ── 唱片舞台 ─────────────────────────────── */
      .turntable {
        --disc: clamp(260px, min(44vh, 40vw), 420px);
        position: relative;
        width: var(--disc);
        aspect-ratio: 1;
        display: grid;
        place-items: center;
      }

      .vinyl {
        position: relative;
        width: 100%;
        aspect-ratio: 1;
        border-radius: 50%;
        background:
          repeating-radial-gradient(
            circle at 50% 50%,
            #0d1015 0px,
            #0d1015 1.4px,
            #1a1e26 1.4px,
            #1a1e26 2.8px
          ),
          #0d1015;
        box-shadow:
          0 0 0 1px rgba(255, 255, 255, 0.06),
          0 30px 80px rgba(40, 80, 130, 0.28),
          0 0 90px rgba(77, 163, 255, 0.14);
        animation: spin 9s linear infinite;
        animation-play-state: paused;
      }

      /* 唱片表面光泽 */
      .vinyl::before {
        content: '';
        position: absolute;
        inset: 0;
        border-radius: 50%;
        background: conic-gradient(
          from 0deg,
          transparent 0deg,
          rgba(190, 225, 255, 0.1) 18deg,
          transparent 42deg,
          transparent 160deg,
          rgba(190, 225, 255, 0.07) 185deg,
          transparent 215deg
        );
        mix-blend-mode: screen;
      }

      /* 唱片内边高光 + 槽纹暗化 */
      .vinyl::after {
        content: '';
        position: absolute;
        inset: 0;
        border-radius: 50%;
        box-shadow:
          inset 0 0 0 1px rgba(255, 255, 255, 0.07),
          inset 0 0 40px rgba(0, 0, 0, 0.55);
      }

      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }

      /* ── 唱片封面标签 ─────────────────────────── */
      .label {
        position: absolute;
        width: 38%;
        aspect-ratio: 1;
        border-radius: 50%;
        background: linear-gradient(145deg, #4fb8f5 0%, #3d8ecf 55%, #7a8ce8 100%);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 3px;
        box-shadow:
          0 0 0 6px rgba(8, 10, 14, 0.9),
          0 0 0 7px rgba(255, 255, 255, 0.08),
          0 6px 22px rgba(0, 0, 0, 0.5);
        animation-name: spin;
        animation-duration: 9s;
        animation-timing-function: linear;
        animation-iteration-count: infinite;
        animation-play-state: inherit;
      }

      .label__brand {
        font-size: clamp(11px, 1.5vh, 15px);
        font-weight: 700;
        letter-spacing: 0.34em;
        color: rgba(255, 255, 255, 0.92);
      }

      .label__series {
        font-size: clamp(9px, 1.2vh, 11px);
        letter-spacing: 0.2em;
        color: rgba(255, 255, 255, 0.55);
      }

      .label__hole {
        position: absolute;
        width: 9%;
        aspect-ratio: 1;
        border-radius: 50%;
        background: #f4f9ff;
        box-shadow: inset 0 0 0 1.5px rgba(70, 120, 170, 0.4);
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
      }

      /* ── NOW PLAYING 徽章 ────────────────────── */
      .badge {
        display: inline-flex;
        align-items: center;
        gap: 9px;
        padding: 7px 16px;
        border-radius: 999px;
        font-family: 'JetBrains Mono', 'Roboto Mono', Consolas, monospace;
        font-size: 10.5px;
        letter-spacing: 0.28em;
        text-transform: uppercase;
        color: #2f7fe0;
        background: rgba(47, 127, 224, 0.08);
        border: 1px solid rgba(47, 127, 224, 0.22);
      }

      .badge__dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #2f7fe0;
        box-shadow: 0 0 10px #2f7fe0;
        animation: pulse 1.6s ease-in-out infinite;
      }

      .badge__text {
        font-family: inherit;
      }

      @keyframes pulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.5; transform: scale(0.85); }
      }

      /* ── 标题区 ──────────────────────────────── */
      .meta {
        text-align: center;
      }

      .meta__title {
        font-family: 'Noto Serif SC', Georgia, 'Songti SC', 'SimSun', serif;
        font-size: clamp(28px, 4.4vh, 44px);
        font-weight: 600;
        letter-spacing: 0.04em;
        line-height: 1.15;
        color: rgba(18, 32, 48, 0.92);
        margin: 0 0 10px;
      }

      .meta__sub {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
        flex-wrap: wrap;
        font-size: 13px;
        letter-spacing: 0.14em;
        color: rgba(18, 32, 48, 0.6);
      }

      .meta__sub .sep {
        width: 3px;
        height: 3px;
        border-radius: 50%;
        background: rgba(18, 32, 48, 0.32);
      }

      .meta__dur {
        font-family: 'JetBrains Mono', 'Roboto Mono', Consolas, monospace;
      }

      /* ── 平板 ────────────────────────────────── */
      @media (max-width: 1099px) {
        .turntable {
          --disc: min(44vw, 300px);
        }

        .meta__title {
          font-size: clamp(24px, 4vw, 34px);
        }
      }

      /* ── 手机 ────────────────────────────────── */
      @media (max-width: 767px) {
        .deck {
          gap: 14px;
          padding: 20px 16px;
        }

        .turntable {
          --disc: min(64vw, 280px);
        }

        .meta__title {
          font-size: clamp(20px, 6vw, 28px);
        }

        .meta__sub {
          font-size: 12px;
          letter-spacing: 0.08em;
        }
      }
    `,
  ],
})
export class AudioPlayerComponent implements AfterViewInit, OnDestroy {
  readonly svc = inject(MediaPlaybackService);
  private audioRef = viewChild<ElementRef<HTMLAudioElement>>('audioElement');

  private readonly _defaultTitle = signal('串烧 One');
  private readonly _defaultSubtitle = signal('Medley One · 纯音乐串烧');

  readonly trackNumber = computed(() => {
    const track = this.svc.currentTrack();
    if (!track) return '--';
    const idx = this.svc.tracks.findIndex((t) => t.key === track.key);
    return String(idx + 1).padStart(2, '0');
  });

  readonly labelGradient = computed(
    () => this.svc.currentTrack()?.artworkGradient
      || 'linear-gradient(145deg, #4fb8f5 0%, #3d8ecf 55%, #7a8ce8 100%)'
  );

  defaultTitle(): string { return this._defaultTitle(); }
  defaultSubtitle(): string { return this._defaultSubtitle(); }

  ngAfterViewInit(): void {
    const el = this.audioRef()?.nativeElement;
    if (el) {
      this.svc.attachAudioElement(el);
    }
  }

  ngOnDestroy(): void {
    this.svc.detachAudioElement();
  }
}
