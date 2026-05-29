import ChartScene from './lib/chartScene';
import { Options } from './lib/interface';

export interface GlobeStreamOptions {
  autoRotate?: boolean;
  theme?: 'blue' | 'green' | 'purple';
  showFlyLines?: boolean;
  showPoints?: boolean;
  showGlow?: boolean;
  // 其他配置...
}

export class GlobeStreamScene {
  private chartScene: ChartScene | null = null;
  private container: HTMLElement;
  private canvas: HTMLCanvasElement;
  private options: GlobeStreamOptions;

  constructor(canvas: HTMLCanvasElement, options: GlobeStreamOptions = {}) {
    this.canvas = canvas;
    this.container = canvas.parentElement || canvas;
    this.options = {
      autoRotate: true,
      theme: 'blue',
      showFlyLines: true,
      showPoints: true,
      showGlow: true,
      ...options,
    };
  }

  init(): void {
    // 配置参数
    const chartOptions: Partial<Options> = {
      dom: this.canvas,
      autoRotate: this.options.autoRotate,
      rotateSpeed: 0.005,
      mode: '3d',
      cameraType: 'PerspectiveCamera',
      light: 'DirectionalLight',
      helper: false,
      map: 'world',
      config: {
        R: 100,
        texture: {
          path: 'assets/three/globe-stream/image/map.svg', // 纹理路径
          mixed: false,
        },
        earth: {
          material: 'MeshPhongMaterial',
          color: '#1a2a3a',
        },
        spriteStyle: {
          color: '#797eff',
          show: true,
        },
        // 其他配置...
      },
    };

    // 根据主题调整颜色
    if (this.options.theme === 'blue') {
      chartOptions.config!.earth!.color = '#1a2a3a';
    } else if (this.options.theme === 'green') {
      chartOptions.config!.earth!.color = '#1a3a2a';
    } else if (this.options.theme === 'purple') {
      chartOptions.config!.earth!.color = '#2a1a3a';
    }

    this.chartScene = new ChartScene(chartOptions);
  }

  start(): void {
    // ChartScene 的 animate 方法已经在 init 中调用
  }

  stop(): void {
    if (this.chartScene) {
      // 暂停动画？ChartScene 没有暴露暂停方法，但我们可以取消 animationFrameId
      // 这里暂时不做处理，因为 ChartScene 内部有 animationFrameId
    }
  }

  resize(): void {
    if (this.chartScene) {
      const width = this.container.clientWidth;
      const height = this.container.clientHeight;
      // ChartScene 没有暴露 resize 方法，但我们可以手动调整
      this.chartScene.renderer.setSize(width, height);
      (this.chartScene.camera as any).aspect = width / height;
      (this.chartScene.camera as any).updateProjectionMatrix();
    }
  }

  destroy(): void {
    if (this.chartScene) {
      this.chartScene.destroy();
      this.chartScene = null;
    }
  }
}
