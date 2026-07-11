import {
  Component,
  ChangeDetectionStrategy,
  inject,
  viewChild,
  ElementRef,
  AfterViewInit,
  OnDestroy,
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

    <div class="now-playing">
      @if (svc.currentTrack(); as track) {
        <div class="now-playing__artwork" [style.background]="track.artworkGradient">
          <mat-icon class="now-playing__artwork-icon">music_note</mat-icon>
          <span class="now-playing__artwork-label">{{ track.subtitle }}</span>
        </div>
        <div class="now-playing__info">
          <h2 class="now-playing__title">{{ track.title }}</h2>
          <span class="now-playing__subtitle">{{ track.subtitle }}</span>
        </div>
      } @else {
        <div class="now-playing__artwork now-playing__artwork--empty">
          <mat-icon class="now-playing__artwork-icon">music_note</mat-icon>
        </div>
        <div class="now-playing__info">
          <h2 class="now-playing__title now-playing__title--empty">选择一首歌曲开始播放</h2>
        </div>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .now-playing {
        background: var(--music-surface, #0d1c2d);
        border-radius: 16px;
        padding: clamp(24px, 3vw, 40px);
        display: grid;
        grid-template-columns: minmax(200px, 320px) minmax(0, 1fr);
        align-items: center;
        gap: clamp(24px, 4vw, 56px);
      }

      /* ── Artwork ────────────────────────────────── */
      .now-playing__artwork {
        aspect-ratio: 1;
        border-radius: 20px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 12px;
        width: clamp(200px, 26vw, 320px);
      }

      .now-playing__artwork--empty {
        background: var(--music-surface-raised, #122840);
        opacity: 0.5;
      }

      .now-playing__artwork-icon {
        font-size: 56px;
        width: 56px;
        height: 56px;
        color: rgba(255, 255, 255, 0.7);
      }

      .now-playing__artwork-label {
        font-size: 0.85rem;
        font-weight: 600;
        color: rgba(255, 255, 255, 0.55);
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      /* ── Info ───────────────────────────────────── */
      .now-playing__info {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .now-playing__title {
        font-size: 1.6rem;
        font-weight: 700;
        margin: 0;
        color: var(--music-text, #f4f8ff);
        letter-spacing: -0.01em;
      }

      .now-playing__title--empty {
        font-weight: 400;
        font-size: 1.1rem;
        color: var(--music-text-secondary, #a9bdd3);
      }

      .now-playing__subtitle {
        font-size: 0.9rem;
        color: var(--music-text-secondary, #a9bdd3);
      }

      /* ── Responsive: Tablet ────────────────────── */
      @media (max-width: 1099px) {
        .now-playing {
          grid-template-columns: 1fr;
          justify-items: center;
        }

        .now-playing__info {
          align-items: center;
          text-align: center;
        }

        .now-playing__artwork {
          width: clamp(180px, 40vw, 280px);
        }
      }

      /* ── Responsive: Mobile ────────────────────── */
      @media (max-width: 767px) {
        .now-playing {
          padding: 24px 16px;
          grid-template-columns: 1fr;
          justify-items: center;
        }

        .now-playing__artwork {
          width: clamp(160px, 50vw, 240px);
        }

        .now-playing__title {
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
