import { Injectable, OnDestroy, signal } from '@angular/core';
import {
  MusicTrack,
  TRACKS,
  resolveMediaUrl,
  pickVideoSource,
} from '../models/music-track.model';

export type MusicMode = 'audio' | 'video';

/**
 * 音乐台播放状态中枢。
 * 由 MusicComponent 局部提供（非 root），离开页面时自动销毁。
 *
 * 职责：
 * - 管理唯一 <audio> 元素引用（由 AudioPlayerComponent 注册）
 * - 播放/暂停/切歌/进度/音量
 * - audio/video 互斥
 * - 媒体事件解析（loadstart/canplay/waiting/error/timeupdate/ended）
 * - 资源清理
 */
@Injectable()
export class MediaPlaybackService implements OnDestroy {
  // ── 信号 ────────────────────────────────────────
  readonly tracks = TRACKS;

  readonly mode = signal<MusicMode>('audio');
  readonly currentTrack = signal<MusicTrack | null>(null);

  readonly isPlaying = signal(false);
  readonly isLoading = signal(false);
  readonly isBuffering = signal(false);
  readonly mediaError = signal<string | null>(null);
  readonly playHint = signal(false);

  readonly currentTime = signal(0);
  readonly duration = signal(0);
  readonly volume = signal(0.8);

  /** 当前 active 的视频 track key（视频模式下） */
  readonly activeVideoKey = signal<string | null>(null);

  // ── 内部 ────────────────────────────────────────
  private audio: HTMLAudioElement | null = null;
  private timeUpdateHandler = () => {
    if (this.audio) {
      this.currentTime.set(this.audio.currentTime);
    }
  };

  // ── Audio 元素注册 ──────────────────────────────
  attachAudioElement(el: HTMLAudioElement): void {
    this.audio = el;
    el.volume = this.volume();
    this.bindAudioEvents(el);
  }

  detachAudioElement(): void {
    if (this.audio) {
      this.unbindAudioEvents(this.audio);
      this.audio.pause();
      this.audio.removeAttribute('src');
      this.audio.load();
      this.audio = null;
    }
  }

  // ── 播放控制 ────────────────────────────────────
  selectTrack(key: string): void {
    const track = this.tracks.find((t) => t.key === key);
    if (!track) return;

    // 音频视频互斥
    this.pauseActiveVideo();

    this.currentTrack.set(track);
    this.mediaError.set(null);
    this.isLoading.set(true);
    this.isBuffering.set(false);
    this.currentTime.set(0);

    const audio = this.audio;
    if (!audio) return;

    const src = resolveMediaUrl(track.mp3Src);

    audio.pause();

    if (audio.src !== src) {
      audio.src = src;
      audio.load();
    }

    audio
      .play()
      .then(() => {
        this.isPlaying.set(true);
        this.playHint.set(false);
        this.mediaError.set(null);
      })
      .catch((err) => {
        this.isPlaying.set(false);
        this.isLoading.set(false);
        this.handlePlayRejection(err);
      });
  }

  togglePlay(): void {
    const audio = this.audio;
    if (!audio || !this.currentTrack()) return;

    if (audio.paused) {
      audio
        .play()
        .then(() => {
          this.isPlaying.set(true);
          this.playHint.set(false);
        })
        .catch((err) => this.handlePlayRejection(err));
    } else {
      audio.pause();
      this.isPlaying.set(false);
    }
  }

  next(): void {
    const idx = this.currentIndex();
    if (idx < 0) return;
    const nextIdx = (idx + 1) % this.tracks.length;
    this.selectTrack(this.tracks[nextIdx].key);
  }

  previous(): void {
    const idx = this.currentIndex();
    if (idx < 0) return;
    const prevIdx = (idx - 1 + this.tracks.length) % this.tracks.length;
    this.selectTrack(this.tracks[prevIdx].key);
  }

  seek(time: number): void {
    if (this.audio) {
      this.audio.currentTime = time;
      this.currentTime.set(time);
    }
  }

  setVolume(vol: number): void {
    this.volume.set(vol);
    if (this.audio) {
      this.audio.volume = vol;
    }
  }

  /** 格式化秒数为 mm:ss */
  formatTime(seconds: number): string {
    if (!isFinite(seconds) || seconds < 0) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  // ── 模式切换 ────────────────────────────────────
  setMode(m: MusicMode): void {
    if (this.mode() === m) return;

    if (m === 'video') {
      // 进入视频模式：暂停音频
      if (this.audio && !this.audio.paused) {
        this.audio.pause();
        this.isPlaying.set(false);
      }
    } else {
      // 返回音频模式：暂停视频
      this.pauseActiveVideo();
    }

    this.mode.set(m);
  }

  pauseActiveVideo(): void {
    this.activeVideoKey.set(null);
  }

  setActiveVideo(key: string | null): void {
    // 音频视频互斥：播放视频时暂停音频
    if (key && this.audio && !this.audio.paused) {
      this.audio.pause();
      this.isPlaying.set(false);
    }
    this.activeVideoKey.set(key);
  }

  /** 获取视频源信息（含 HEVC 检测） */
  getVideoSource(track: MusicTrack): { src: string; reason: string } {
    return pickVideoSource(track);
  }

  /** 检测慢网络 / saveData */
  isSlowNetwork(): boolean {
    if (typeof navigator === 'undefined') return false;
    const conn = (navigator as any).connection;
    if (!conn) return false;
    if (conn.saveData) return true;
    const type = conn.effectiveType;
    return type === 'slow-2g' || type === '2g' || type === '3g';
  }

  // ── 生命周期 ────────────────────────────────────
  ngOnDestroy(): void {
    this.stopAll();
  }

  stopAll(): void {
    this.detachAudioElement();
    this.isPlaying.set(false);
    this.isLoading.set(false);
    this.isBuffering.set(false);
    this.currentTrack.set(null);
    this.activeVideoKey.set(null);
    this.currentTime.set(0);
    this.duration.set(0);
    this.mediaError.set(null);
  }

  // ── 私有：事件绑定 ──────────────────────────────
  private bindAudioEvents(el: HTMLAudioElement): void {
    el.addEventListener('loadstart', this.onLoadStart);
    el.addEventListener('loadedmetadata', this.onLoadedMetadata);
    el.addEventListener('canplay', this.onCanPlay);
    el.addEventListener('playing', this.onPlaying);
    el.addEventListener('pause', this.onPause);
    el.addEventListener('waiting', this.onWaiting);
    el.addEventListener('stalled', this.onStalled);
    el.addEventListener('ended', this.onEnded);
    el.addEventListener('error', this.onError);
    el.addEventListener('timeupdate', this.timeUpdateHandler);
  }

  private unbindAudioEvents(el: HTMLAudioElement): void {
    el.removeEventListener('loadstart', this.onLoadStart);
    el.removeEventListener('loadedmetadata', this.onLoadedMetadata);
    el.removeEventListener('canplay', this.onCanPlay);
    el.removeEventListener('playing', this.onPlaying);
    el.removeEventListener('pause', this.onPause);
    el.removeEventListener('waiting', this.onWaiting);
    el.removeEventListener('stalled', this.onStalled);
    el.removeEventListener('ended', this.onEnded);
    el.removeEventListener('error', this.onError);
    el.removeEventListener('timeupdate', this.timeUpdateHandler);
  }

  // ── 私有：事件处理 ──────────────────────────────
  private onLoadStart = () => {
    this.isLoading.set(true);
    this.mediaError.set(null);
  };

  private onLoadedMetadata = () => {
    if (this.audio) {
      this.duration.set(this.audio.duration);
    }
  };

  private onCanPlay = () => {
    this.isLoading.set(false);
    this.isBuffering.set(false);
  };

  private onPlaying = () => {
    this.isPlaying.set(true);
    this.isLoading.set(false);
    this.isBuffering.set(false);
    this.mediaError.set(null);
  };

  private onPause = () => {
    this.isPlaying.set(false);
  };

  private onWaiting = () => {
    this.isBuffering.set(true);
  };

  private onStalled = () => {
    this.isBuffering.set(true);
  };

  private onEnded = () => {
    this.isPlaying.set(false);
    // 自动播放下一首
    this.next();
  };

  private onError = () => {
    this.isPlaying.set(false);
    this.isLoading.set(false);
    this.isBuffering.set(false);

    if (!this.audio?.error) {
      this.mediaError.set('媒体加载发生未知错误。');
      return;
    }

    const code = this.audio.error.code;
    switch (code) {
      case 1:
        this.mediaError.set('播放已中止。');
        break;
      case 2:
        this.mediaError.set('网络加载失败，请检查网络连接后重试。');
        break;
      case 3:
        this.mediaError.set('媒体解码失败，文件格式可能已损坏。');
        break;
      case 4:
        this.mediaError.set('媒体格式或地址不受支持，请检查文件是否存在。');
        break;
      default:
        this.mediaError.set(`媒体错误 (code=${code})`);
    }
  };

  // ── 私有：辅助 ──────────────────────────────────
  private currentIndex(): number {
    const key = this.currentTrack()?.key;
    if (!key) return -1;
    return this.tracks.findIndex((t) => t.key === key);
  }

  private handlePlayRejection(err: any): void {
    if (err?.name === 'NotAllowedError') {
      this.playHint.set(true);
    } else {
      this.mediaError.set('播放失败：' + (err?.message || '未知错误'));
    }
  }
}
