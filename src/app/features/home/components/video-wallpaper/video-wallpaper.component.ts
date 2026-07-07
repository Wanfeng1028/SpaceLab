import {
  Component,
  ChangeDetectionStrategy,
  signal,
  OnInit,
  OnDestroy,
  ElementRef,
  viewChild,
  inject,
} from '@angular/core';

// ── 壁纸配置 ──────────────────────────────────────
interface Wallpaper {
  src: string;
  /** 预留移动端低分辨率源，暂不填值 */
  mobileSrc?: string;
}

const WALLPAPERS: Wallpaper[] = [
  { src: '/wallpapers/pixel-lofi-city.mp4' },
  { src: '/wallpapers/azure-blade.mp4' },
  { src: '/wallpapers/cat-sakura-street.mp4' },
];

// ── 浏览器扩展类型 ────────────────────────────────
interface NavConnection {
  saveData?: boolean;
  effectiveType?: string;
}

@Component({
  selector: 'app-video-wallpaper',
  templateUrl: './video-wallpaper.component.html',
  styleUrl: './video-wallpaper.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VideoWallpaperComponent implements OnInit, OnDestroy {
  /** 当前播放的视频索引 (0 = A, 1 = B) */
  readonly activeSlot = signal<0 | 1>(0);
  /** 是否应该跳过视频（慢网 / saveData / reduced-motion） */
  readonly useFallback = signal(false);

  readonly videoA = viewChild<ElementRef<HTMLVideoElement>>('videoA');
  readonly videoB = viewChild<ElementRef<HTMLVideoElement>>('videoB');

  private currentIndex = 0;
  private timerId: ReturnType<typeof setTimeout> | null = null;
  private readonly prefersReducedMotion =
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;

  ngOnInit(): void {
    // 网络 / 省流量检测
    const nav = navigator as Navigator & {
      connection?: NavConnection;
      mozConnection?: NavConnection;
      webkitConnection?: NavConnection;
    };
    const conn = nav.connection ?? nav.mozConnection ?? nav.webkitConnection;
    const isSlow =
      conn?.saveData === true ||
      ['slow-2g', '2g', '3g'].includes(conn?.effectiveType ?? '');

    if (isSlow || this.prefersReducedMotion) {
      this.useFallback.set(true);
      return;
    }

    // 初始化第一个视频
    this.loadVideo(0, this.currentIndex);
    this.scheduleNext();
  }

  ngOnDestroy(): void {
    this.clearTimer();
  }

  /** 当视频播放结束时的回调（用于循环） */
  onVideoLoop(slot: 0 | 1): void {
    const ref = slot === 0 ? this.videoA() : this.videoB();
    ref?.nativeElement.play().catch(() => {});
  }

  // ── 内部方法 ──────────────────────────────────────

  private scheduleNext(): void {
    // 30-45 秒随机
    const delay = (30 + Math.random() * 15) * 1000;
    this.timerId = setTimeout(() => this.switchWallpaper(), delay);
  }

  private switchWallpaper(): void {
    // 下一个壁纸索引
    this.currentIndex = (this.currentIndex + 1) % WALLPAPERS.length;
    const nextSlot: 0 | 1 = this.activeSlot() === 0 ? 1 : 0;

    this.loadVideo(nextSlot, this.currentIndex);

    // 切换 active slot → CSS transition 做淡入淡出
    this.activeSlot.set(nextSlot);

    this.scheduleNext();
  }

  private loadVideo(slot: 0 | 1, wallpaperIndex: number): void {
    const ref = slot === 0 ? this.videoA() : this.videoB();
    if (!ref) return;
    const video = ref.nativeElement;
    const wp = WALLPAPERS[wallpaperIndex];
    if (video.src !== window.location.origin + wp.src) {
      video.src = wp.mobileSrc ?? wp.src;
      video.load();
      video.play().catch(() => {});
    }
  }

  private clearTimer(): void {
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }
}
