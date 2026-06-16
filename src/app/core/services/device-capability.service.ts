import { Injectable, signal } from '@angular/core';

export type DeviceTier = 'high' | 'medium' | 'low' | 'unsupported';

export interface DeviceCapability {
  tier: DeviceTier;
  webgl: boolean;
  webgl2: boolean;
  /** 是否为移动设备 */
  mobile: boolean;
  /** 是否为低端设备（内存 < 4GB / 旧 GPU） */
  lowEnd: boolean;
  /** 是否支持 WebGL 纹理 */
  maxTextureSize: number;
  /** 检测是否完成 */
  checked: boolean;
}

@Injectable({ providedIn: 'root' })
export class DeviceCapabilityService {
  readonly capability = signal<DeviceCapability>({
    tier: 'high',
    webgl: true,
    webgl2: true,
    mobile: false,
    lowEnd: false,
    maxTextureSize: 4096,
    checked: false,
  });

  constructor() {
    this.detect();
  }

  private detect(): void {
    const cap: DeviceCapability = {
      tier: 'high',
      webgl: false,
      webgl2: false,
      mobile: false,
      lowEnd: false,
      maxTextureSize: 0,
      checked: true,
    };

    // 移动设备检测
    cap.mobile = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
      typeof navigator !== 'undefined' ? navigator.userAgent : ''
    );

    // WebGL 检测
    try {
      const canvas = document.createElement('canvas');
      const gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
      cap.webgl = !!gl;

      const gl2 = canvas.getContext('webgl2');
      cap.webgl2 = !!gl2;

      if (gl) {
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        if (ext) {
          const renderer = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) as string;
          const lowEndGpus = /intel hd graphics|intel gma|mali-400|adreno 3|adreno 4|powervr sgx/i;
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

    // 综合判定设备等级
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
}
