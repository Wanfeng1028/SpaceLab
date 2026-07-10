// ================================================================
// MusicTrack model — SpaceLab 音乐台
// ================================================================

export interface MusicTrack {
  key: string;
  title: string;
  subtitle: string;
  duration: string;
  mp3Src: string;
  /** 原始 H.265 视频文件路径（可选） */
  originalVideoSrc?: string;
  /** H.264 网页兼容版视频路径（可选，转码后填入） */
  webVideoSrc?: string;
  /** WebP poster 路径（可选，生成后填入） */
  posterSrc?: string;
}

/**
 * 媒体文件基础路径。
 * 修改此值可切换到 OSS / COS / CDN，无需改组件代码。
 */
export const MEDIA_BASE_URL = 'music/';

/**
 * 将相对路径解析为基于 document.baseURI 的绝对地址。
 * 兼容本地开发和 GitHub Pages 子目录部署。
 */
export function resolveMediaUrl(relativePath: string): string {
  return new URL(relativePath, document.baseURI).href;
}

/**
 * 检测当前浏览器是否支持 HEVC (H.265) 播放。
 * 同时检测 hvc1 和 hev1 两种 codec 标识，任一支持即返回 true。
 */
export function isHevcSupported(): boolean {
  if (typeof document === 'undefined') return false;
  const video = document.createElement('video');
  return (
    video.canPlayType('video/mp4; codecs="hvc1"') !== '' ||
    video.canPlayType('video/mp4; codecs="hev1"') !== ''
  );
}

/**
 * 为给定曲目选择最佳可用视频源。
 * 返回 { src, reason } — src 为空时表示无法播放。
 */
export function pickVideoSource(track: MusicTrack): { src: string; reason: string } {
  // 1. 优先 H.264 网页版
  if (track.webVideoSrc) {
    return { src: track.webVideoSrc, reason: 'h264' };
  }
  // 2. 尝试 H.265 原始文件
  if (track.originalVideoSrc && isHevcSupported()) {
    return { src: track.originalVideoSrc, reason: 'hevc' };
  }
  // 3. 无法播放
  if (track.originalVideoSrc && !isHevcSupported()) {
    return {
      src: '',
      reason:
        '当前视频采用 H.265/HEVC 编码，此浏览器暂不支持播放。音频版本可以正常使用，后续补充 H.264 网页兼容版。',
    };
  }
  return { src: '', reason: '没有可用的视频源。' };
}

// ================================================================
// 曲目列表
// ================================================================
export const TRACKS: MusicTrack[] = [
  {
    key: 'chuanshao',
    title: '传说',
    subtitle: 'Legend',
    mp3Src: MEDIA_BASE_URL + 'chuanshao-.mp3',
    originalVideoSrc: MEDIA_BASE_URL + 'chuanshao-.mp4',
    duration: '43:11',
  },
  {
    key: 'chuanshao-1',
    title: '传说 · 壹',
    subtitle: 'Legend I',
    mp3Src: MEDIA_BASE_URL + 'chuanshao-1.mp3',
    originalVideoSrc: MEDIA_BASE_URL + 'chuanshao-1.mp4',
    duration: '38:27',
  },
  {
    key: 'chuanshao-2',
    title: '传说 · 贰',
    subtitle: 'Legend II',
    mp3Src: MEDIA_BASE_URL + 'chuanshao-2.mp3',
    originalVideoSrc: MEDIA_BASE_URL + 'chuanshao-2.mp4',
    duration: '35:06',
  },
  {
    key: 'chuanshao-3',
    title: '传说 · 叁',
    subtitle: 'Legend III',
    mp3Src: MEDIA_BASE_URL + 'chuanshao-3.mp3',
    originalVideoSrc: MEDIA_BASE_URL + 'chuanshao-3.mp4',
    duration: '36:00',
  },
];
