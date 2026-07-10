import {
  Component,
  ChangeDetectionStrategy,
  signal,
  ElementRef,
  viewChild,
  inject,
} from '@angular/core';
import { I18nService } from '../../core/services/i18n.service';

interface MusicTrack {
  key: string;
  title: string;
  titleEn: string;
  mp3Src: string;
  mp4Src: string;
  duration: string;
}

const TRACKS: MusicTrack[] = [
  {
    key: 'chuanshao',
    title: '传说',
    titleEn: 'Legend',
    mp3Src: 'music/chuanshao-.mp3',
    mp4Src: 'music/chuanshao-.mp4',
    duration: '43:11',
  },
  {
    key: 'chuanshao-1',
    title: '传说 · 壹',
    titleEn: 'Legend I',
    mp3Src: 'music/chuanshao-1.mp3',
    mp4Src: 'music/chuanshao-1.mp4',
    duration: '38:27',
  },
  {
    key: 'chuanshao-2',
    title: '传说 · 贰',
    titleEn: 'Legend II',
    mp3Src: 'music/chuanshao-2.mp3',
    mp4Src: 'music/chuanshao-2.mp4',
    duration: '35:06',
  },
  {
    key: 'chuanshao-3',
    title: '传说 · 叁',
    titleEn: 'Legend III',
    mp3Src: 'music/chuanshao-3.mp3',
    mp4Src: 'music/chuanshao-3.mp4',
    duration: '36:00',
  },
];

@Component({
  selector: 'app-music',
  templateUrl: './music.component.html',
  styleUrl: './music.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MusicComponent {
  private i18n = inject(I18nService);

  readonly tracks = TRACKS;
  readonly currentTrack = signal<string | null>(null);
  readonly activeVideo = signal<string | null>(null);
  readonly playHint = signal(false);

  readonly audioEl = viewChild<ElementRef<HTMLAudioElement>>('audioPlayer');

  t(key: string): string {
    return this.i18n.t(key);
  }

  /** 选择并播放歌曲 */
  selectTrack(key: string): void {
    // 切换歌曲时关闭视频
    this.activeVideo.set(null);
    this.currentTrack.set(key);

    const audio = this.audioEl()?.nativeElement;
    if (audio) {
      audio.play().catch(() => {
        this.playHint.set(true);
      });
    }
  }

  /** 切换视频版显示 */
  toggleVideo(key: string): void {
    if (this.activeVideo() === key) {
      this.activeVideo.set(null);
    } else {
      this.activeVideo.set(key);
    }
  }

  /** 音频元素准备好播放后清除提示 */
  onAudioCanPlay(): void {
    this.playHint.set(false);
  }

  /** 判断某曲目是否为当前正在播放 */
  isPlaying(key: string): boolean {
    return this.currentTrack() === key;
  }

  /** 获取曲目的 mp3 源地址 */
  getTrackSrc(key: string | null): string {
    if (!key) return '';
    const track = this.tracks.find((t) => t.key === key);
    return track?.mp3Src ?? '';
  }
}
