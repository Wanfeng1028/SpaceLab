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
import { MatButtonModule } from '@angular/material/button';
import { MatSliderModule } from '@angular/material/slider';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MediaPlaybackService } from '../../services/media-playback.service';
import { MediaErrorComponent } from '../media-error/media-error.component';

@Component({
  selector: 'app-audio-player',
  standalone: true,
  imports: [
    MatIconModule,
    MatButtonModule,
    MatSliderModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MediaErrorComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- 唯一 audio 元素 -->
    <audio
      #audioElement
      preload="metadata"
    ></audio>

    <div class="audio-player">
      <!-- 当前曲目信息 -->
      @if (svc.currentTrack(); as track) {
        <div class="player-info">
          <h2 class="player-info__title">{{ track.title }}</h2>
          <span class="player-info__subtitle">{{ track.subtitle }}</span>
        </div>
      } @else {
        <div class="player-info">
          <h2 class="player-info__title player-info__title--empty">选择一首歌曲开始播放</h2>
        </div>
      }

      <!-- 缓冲指示器 -->
      @if (svc.isBuffering()) {
        <mat-progress-bar mode="indeterminate" class="player-buffer" />
      } @else {
        <div class="player-buffer-spacer"></div>
      }

      <!-- 进度条 -->
      <div class="player-progress">
        <span class="player-progress__time">{{ svc.formatTime(svc.currentTime()) }}</span>
        <mat-slider
          class="player-progress__slider"
          [min]="0"
          [max]="svc.duration() || 1"
          [step]="1"
          [discrete]="true"
        >
          <input
            matSliderThumb
            [value]="svc.currentTime()"
            (valueChange)="svc.seek($event)"
          />
        </mat-slider>
        <span class="player-progress__time">{{ svc.formatTime(svc.duration()) }}</span>
      </div>

      <!-- 控制按钮 -->
      <div class="player-controls">
        <button
          mat-icon-button
          matTooltip="上一首"
          (click)="svc.previous()"
        >
          <mat-icon>skip_previous</mat-icon>
        </button>

        <button
          mat-fab
          class="player-controls__play"
          matTooltip="{{ svc.isPlaying() ? '暂停' : '播放' }}"
          (click)="svc.togglePlay()"
        >
          <mat-icon>{{ svc.isPlaying() ? 'pause' : 'play_arrow' }}</mat-icon>
        </button>

        <button
          mat-icon-button
          matTooltip="下一首"
          (click)="svc.next()"
        >
          <mat-icon>skip_next</mat-icon>
        </button>
      </div>

      <!-- 音量 -->
      <div class="player-volume">
        <button mat-icon-button (click)="toggleMute()">
          <mat-icon>{{ volumeIcon() }}</mat-icon>
        </button>
        <mat-slider
          class="player-volume__slider"
          [min]="0"
          [max]="1"
          [step]="0.05"
        >
          <input
            matSliderThumb
            [value]="svc.volume()"
            (valueChange)="svc.setVolume($event)"
          />
        </mat-slider>
      </div>

      <!-- 播放提示 -->
      @if (svc.playHint()) {
        <p class="player-hint">请点击歌曲或播放按钮开始</p>
      }

      <!-- 错误状态 -->
      @if (svc.mediaError(); as err) {
        <app-media-error
          [message]="err"
          (retry)="retryPlayback()"
        />
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .audio-player {
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding: 20px 24px;
        background: var(--mat-sys-surface, #fff);
        border-radius: 12px;
        border: 1px solid var(--mat-sys-outline-variant, #e0e0e0);
      }

      /* ── 曲目信息 ── */
      .player-info {
        text-align: center;
      }

      .player-info__title {
        font-size: 1.25rem;
        font-weight: 600;
        margin: 0 0 2px;
        color: var(--mat-sys-on-surface, #171717);
      }

      .player-info__title--empty {
        font-weight: 400;
        font-size: 1rem;
        color: var(--mat-sys-on-surface-variant, #999);
      }

      .player-info__subtitle {
        font-size: 0.8rem;
        color: var(--mat-sys-on-surface-variant, #666);
      }

      /* ── 缓冲 ── */
      .player-buffer {
        height: 3px;
      }

      .player-buffer-spacer {
        height: 3px;
      }

      /* ── 进度 ── */
      .player-progress {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .player-progress__slider {
        flex: 1;
      }

      .player-progress__time {
        font-size: 0.7rem;
        font-family: 'Roboto Mono', monospace;
        color: var(--mat-sys-on-surface-variant, #999);
        min-width: 36px;
        text-align: center;
      }

      /* ── 控制 ── */
      .player-controls {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
      }

      .player-controls__play {
        --mat-fab-container-color: var(--mat-sys-primary, #1a73e8);
        --mat-fab-icon-color: var(--mat-sys-on-primary, #fff);
      }

      /* ── 音量 ── */
      .player-volume {
        display: flex;
        align-items: center;
        gap: 4px;
        justify-content: center;
      }

      .player-volume__slider {
        width: 100px;
      }

      /* ── 提示 ── */
      .player-hint {
        text-align: center;
        font-size: 0.75rem;
        color: var(--mat-sys-on-surface-variant, #999);
        margin: 0;
      }

      /* ── 移动端 ── */
      @media (max-width: 767px) {
        .audio-player {
          padding: 16px;
        }

        .player-volume__slider {
          width: 80px;
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

  volumeIcon(): string {
    const vol = this.svc.volume();
    if (vol === 0) return 'volume_off';
    if (vol < 0.5) return 'volume_down';
    return 'volume_up';
  }

  toggleMute(): void {
    if (this.svc.volume() > 0) {
      this.svc.setVolume(0);
    } else {
      this.svc.setVolume(0.8);
    }
  }

  retryPlayback(): void {
    const key = this.svc.currentTrack()?.key;
    if (key) {
      this.svc.selectTrack(key);
    }
  }
}
