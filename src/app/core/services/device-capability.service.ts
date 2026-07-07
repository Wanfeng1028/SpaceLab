import { Injectable, signal } from '@angular/core';

export type DeviceTier = 'high' | 'medium' | 'low' | 'unsupported';

export interface DeviceCapability {
  tier: DeviceTier;
  webgl: boolean;
  webgl2: boolean;
  /** 是否为移动设备 */
  mobile: boolean;
  /** 是否为低端设备（内存 < 4GB / 旧 GPU / 慢网络） */
  lowEnd: boolean;
  /** WebGL 最大纹理尺寸 */
  maxTextureSize: number;
  /** 逻辑核心数（不可用时为 null） */
  hardwareConcurrency: number | null;
  /** 设备内存 GB（不可用时为 null） */
  deviceMemory: number | null;
  /** 是否为慢网络（saveData / 2g / 3g） */
  slowNetwork: boolean;
  /** 检测是否完成 */
  checked: boolean;
}

// ── 浏览器扩展类型（避免 TS 编译报错） ──────────────────────
interface NavigatorConnection {
  saveData?: boolean;
  effectiveType?: string;
}

interface NavigatorExtended extends Navigator {
  deviceMemory?: number;
  connection?: NavigatorConnection;
  mozConnection?: NavigatorConnection;
  webkitConnection?: NavigatorConnection;
}

@Injectable({ providedIn: 'root' })
export class DeviceCapabilityService {
  readonly capability: ReturnType<typeof signal<DeviceCapability>> = signal<DeviceCapability>({
    tier: 'high',
    webgl: true,
    webgl2: true,
    mobile: false,
    lowEnd: false,
    maxTextureSize: 4096,
    hardwareConcurrency: null,
    deviceMemory: null,
    slowNetwork: false,
    checked: false,
  });

  constructor() {
    this.detect();
  }

  /** 重新检测设备能力 */
  refresh(): void {
    this.detect();
  }

  /**
   * 综合判断当前设备是否适合进入 3D 体验页。
   * 导航栏调用此方法决定是否放行。
   */
  canEnter3D(): boolean {
    const cap = this.capability();
    return cap.tier === 'high' || cap.tier === 'medium';
  }

  /** 是否应该加载全量 3D */
  get shouldLoadFull3D(): boolean {
    return this.capability().tier === 'high';
  }

  /** 是否应该加载轻量 3D */
  get shouldLoadLight3D(): boolean {
    return this.capability().tier === 'medium' || this.capability().tier === 'high';
  }

  /** 是否完全不加载 3D */
  get shouldSkip3D(): boolean {
    return this.capability().tier === 'low' || this.capability().tier === 'unsupported';
  }

  // ── 内部检测 ──────────────────────────────────────────
  private detect(): void {
    const cap: DeviceCapability = {
      tier: 'high',
      webgl: false,
      webgl2: false,
      mobile: false,
      lowEnd: false,
      maxTextureSize: 0,
      hardwareConcurrency: null,
      deviceMemory: null,
      slowNetwork: false,
      checked: true,
    };

    // 移动设备检测
    cap.mobile = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
      typeof navigator !== 'undefined' ? navigator.userAgent : '',
    );

    // WebGL 检测
    try {
      const canvas = document.createElement('canvas');
      const gl =
        (canvas.getContext('webgl') ||
          canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
      cap.webgl = !!gl;

      const gl2 = canvas.getContext('webgl2');
      cap.webgl2 = !!gl2;

      if (gl) {
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        if (ext) {
          const renderer = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) as string;
          const lowEndGpus =
            /intel hd graphics|intel gma|mali-400|adreno 3|adreno 4|powervr sgx/i;
          if (lowEndGpus.test(renderer)) {
            cap.lowEnd = true;
          }
        }

        cap.maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
        if (cap.maxTextureSize < 2048) {
          cap.lowEnd = true;
        }
      }
    } catch {
      cap.webgl = false;
      cap.webgl2 = false;
    }

    // ── 扩展 API 检测（安全访问，浏览器不支持时跳过） ──
    const nav = navigator as NavigatorExtended;

    // CPU 核心数
    if (typeof nav.hardwareConcurrency === 'number') {
      cap.hardwareConcurrency = nav.hardwareConcurrency;
      if (nav.hardwareConcurrency < 4) {
        cap.lowEnd = true;
      }
    }

    // 设备内存
    if (typeof nav.deviceMemory === 'number') {
      cap.deviceMemory = nav.deviceMemory;
      if (nav.deviceMemory < 4) {
        cap.lowEnd = true;
      }
    }

    // 网络状况
    const conn = nav.connection ?? nav.mozConnection ?? nav.webkitConnection;
    if (conn) {
      if (conn.saveData === true) {
        cap.slowNetwork = true;
        cap.lowEnd = true;
      }
      const effType = conn.effectiveType ?? '';
      if (['slow-2g', '2g', '3g'].includes(effType)) {
        cap.slowNetwork = true;
        cap.lowEnd = true;
      }
    }

    // ── 综合判定设备等级 ──
    if (!cap.webgl) {
      cap.tier = 'unsupported';
    } else if (cap.mobile || cap.lowEnd) {
      cap.tier = 'low';
    } else if (cap.webgl2 && !cap.lowEnd && cap.maxTextureSize >= 4096) {
      cap.tier = 'high';
    } else {
      cap.tier = 'medium';
    }

    this.capability.set(cap);
  }
}
