import {
  Component,
  ChangeDetectionStrategy,
  inject,
  viewChild,
  ElementRef,
  AfterViewInit,
  OnDestroy,
  computed,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MediaPlaybackService } from '../../services/media-playback.service';

@Component({
  selector: 'app-audio-player',
  standalone: true,
  imports: [MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <audio #audioElement preload="metadata"></audio>

    <div class="now-playing-panel">
      <div class="now-playing-content">
        @if (svc.currentTrack(); as track) {
          <!-- Artwork: album-cover style -->
          <div class="artwork" [style.background]="track.artworkGradient">
            <span class="artwork__number">{{ trackNumber() }}</span>
            <span class="artwork__legend">LEGEND</span>
            <span class="artwork__title">{{ track.title }}</span>
            <mat-icon class="artwork__note">music_note</mat-icon>
          </div>

          <!-- Info -->
          <div class="track-info">
            <h2 class="track-info__title">{{ track.title }}</h2>
            <span class="track-info__subtitle">{{ track.subtitle }}</span>
            <span class="track-info__duration">{{ track.duration }}</span>
            @if (svc.isPlaying()) {
              <span class="track-info__status">播放中</span>
            } @else if (svc.isBuffering()) {
              <span class="track-info__status">缓冲中…</span>
            }
          </div>
        } @else {
          <!-- Default: Legend series cover -->
          <div class="artwork artwork--default">
            <span class="artwork__legend">LEGEND</span>
            <span class="artwork__series">传说系列</span>
            <mat-icon class="artwork__note">music_note</mat-icon>
          </div>
          <div class="track-info">
            <h2 class="track-info__title track-info__title--empty">选择一首曲目开始播放</h2>
            <span class="track-info__subtitle">传说系列 · 纯音乐串烧</span>
          </div>
        }
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        min-width: 0;
        min-height: 0;
        height: 100%;
      }

      .now-playing-panel {
        height: 100%;
        min-height: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(145deg, #0d2136, #112f4d);
      }

      .now-playing-content {
        width: 100%;
        display: grid;
        grid-template-columns: minmax(280px, 420px) minmax(260px, 1fr);
        align-items: center;
        gap: clamp(32px, 5vw, 72px);
        padding: clamp(32px, 5vw, 64px);
      }

      /* ── Artwork ────────────────────────────────── */
      .artwork {
        width: min(100%, 420px);
        aspect-ratio: 1;
        border-radius: 16px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 8px;
        position: relative;
      }

      .artwork--default {
        background: linear-gradient(145deg, #0a2e5c 0%, #1a5a9e 55%, #3d8ecf 100%);
        opacity: 0.7;
      }

      .artwork__number {
        font-size: clamp(48px, 6vw, 80px);
        font-weight: 800;
        color: rgba(255, 255, 255, 0.12);
        line-height: 1;
        font-family: 'Roboto Mono', monospace;
        letter-spacing: 0.04em;
      }

      .artwork__legend {
        font-size: clamp(20px, 2.6vw, 32px);
        font-weight: 700;
        color: rgba(255, 255, 255, 0.7);
        letter-spacing: 0.25em;
        text-transform: uppercase;
      }

      .artwork__title {
        font-size: clamp(14px, 1.8vw, 20px);
        color: rgba(255, 255, 255, 0.4);
        letter-spacing: 0.08em;
      }

      .artwork__series {
        font-size: clamp(13px, 1.5vw, 16px);
        color: rgba(255, 255, 255, 0.35);
        letter-spacing: 0.12em;
      }

      .artwork__note {
        position: absolute;
        bottom: 16px;
        right: 16px;
        font-size: 36px;
        width: 36px;
        height: 36px;
        color: rgba(255, 255, 255, 0.15);
      }

      /* ── Track info ────────────────────────────── */
      .track-info {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .track-info__title {
        font-size: clamp(1.6rem, 2.5vw, 2.2rem);
        font-weight: 700;
        margin: 0;
        color: #f4f8ff;
        letter-spacing: -0.01em;
        line-height: 1.2;
      }

      .track-info__title--empty {
        font-weight: 400;
        font-size: 1.2rem;
        color: #a9bdd3;
      }

      .track-info__subtitle {
        font-size: 1rem;
        color: #a9bdd3;
      }

      .track-info__duration {
        font-size: 0.85rem;
        font-family: 'Roboto Mono', monospace;
        color: rgba(169, 189, 211, 0.6);
        margin-top: 8px;
      }

      .track-info__status {
        font-size: 0.8rem;
        color: #4da3ff;
        font-weight: 500;
        letter-spacing: 0.04em;
      }

      /* ── Tablet ────────────────────────────────── */
      @media (max-width: 1099px) {
        .now-playing-content {
          grid-template-columns: 1fr;
          justify-items: center;
          text-align: center;
          gap: 24px;
          padding: 24px;
        }

        .track-info {
          align-items: center;
        }

        .artwork {
          width: min(100%, 320px);
        }
      }

      /* ── Mobile ────────────────────────────────── */
      @media (max-width: 767px) {
        .now-playing-content {
          grid-template-columns: 1fr;
          padding: 20px 16px;
          gap: 16px;
        }

        .artwork {
          width: min(100%, 240px);
        }

        .track-info__title {
          font-size: 1.3rem;
          text-align: center;
        }
      }
    `,
  ],
})
export class AudioPlayerComponent implements AfterViewInit, OnDestroy {
  readonly svc = inject(MediaPlaybackService);
  private audioRef = viewChild<ElementRef<HTMLAudioElement>>('audioElement');

  readonly trackNumber = computed(() => {
    const track = this.svc.currentTrack();
    if (!track) return '';
    const idx = this.svc.tracks.findIndex((t) => t.key === track.key);
    return idx >= 0 ? String(idx + 1).padStart(2, '0') : '';
  });

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
