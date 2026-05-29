import chart from '../globe-stream/lib/index';
import ChartScene from '../globe-stream/lib/chartScene';
import { Options } from '../globe-stream/lib/interface';
import worldJSON from '../globe-stream/map/world.json';

export interface EarthFlylineOptions {
  autoRotate?: boolean;
}

export class EarthFlylineScene {
  private chartScene: ChartScene | null = null;
  private canvas: HTMLCanvasElement;
  private container: HTMLElement;
  private options: EarthFlylineOptions;
  private isMobile: boolean;

  constructor(canvas: HTMLCanvasElement, options: EarthFlylineOptions = {}) {
    this.canvas = canvas;
    this.container = canvas.parentElement || canvas;
    this.options = {
      autoRotate: true,
      ...options,
    };
    this.isMobile = window.innerWidth < 768;
  }

  init(): void {
    // 1. 注册世界地图 GeoJSON
    chart.registerMap('world', worldJSON as any);

    // 2. 科技感视效配置参数
    const R_value = this.isMobile ? 120 : 158;
    const chartOptions: Partial<Options> = {
      dom: this.canvas,
      autoRotate: this.options.autoRotate,
      rotateSpeed: 0.003,
      mode: '3d',
      cameraType: 'PerspectiveCamera',
      light: 'DirectionalLight',
      helper: false,
      map: 'world',
      config: {
        R: R_value,
        enableZoom: false,
        zoom: this.isMobile ? 0.8 : 1.05,
        stopRotateByHover: false,
        pixelRatio: Math.min(window.devicePixelRatio, 2),
        texture: {
          path: 'three/globe-stream/image/map.svg', // 地图矢量纹理图
          mixed: false,
        },
        earth: {
          material: 'MeshPhongMaterial',
          color: '#030510',
          dragConfig: {
            rotationSpeed: 0.35,
            inertiaFactor: 0.95,
            disableX: false,
            disableY: true, // 仅允许水平旋转，体验更好
          },
        },
        bgStyle: {
          color: '#040d21',
          opacity: 0, // 透明背景，使用外部 CSS 渐变
        },
        mapStyle: {
          areaColor: '#071f4c',
          lineColor: '#174f9f',
          opacity: 0.85,
        },
        spriteStyle: {
          color: '#0066cc', // 蓝色光晕
          show: true,
          size: 2.3,
        },
        pathStyle: {
          color: 'rgba(0, 160, 255, 0.25)', // 飞线轨迹颜色
          size: 1,
          show: true,
        },
        flyLineStyle: {
          color: '#00f6ff', // 青蓝色动态蝌蚪流光
          size: 3.5,
        },
        scatterStyle: {
          color: '#00ffcc', // 发光城市点及涟漪
          show: true,
          size: R_value * 0.045,
        },
      },
    };

    // 3. 初始化场景实例
    this.chartScene = chart.init(chartOptions);

    // 4. 接入全球真实的节点数据与飞线
    this.setupTelemetryData();
  }

  private async setupTelemetryData(): Promise<void> {
    if (!this.chartScene) return;

    // 全球主要学术研究与 SpaceLab 神经网络核心节点经纬度
    const nodes = {
      beijing: { name: 'Neural Core (PEK)', lon: 116.4074, lat: 39.9042 },
      newyork: { name: 'Node (NYC)', lon: -74.006, lat: 40.7128 },
      london: { name: 'Node (LHR)', lon: -0.1278, lat: 51.5074 },
      tokyo: { name: 'Node (NRT)', lon: 139.6917, lat: 35.6762 },
      sydney: { name: 'Node (SYD)', lon: 151.2093, lat: -33.8688 },
      frankfurt: { name: 'Node (FRA)', lon: 8.6821, lat: 50.1109 },
      capetown: { name: 'Node (CPT)', lon: 18.4241, lat: -33.9249 },
      rio: { name: 'Node (GIG)', lon: -43.1729, lat: -22.9068 },
      sf: { name: 'Node (SFO)', lon: -122.4194, lat: 37.7749 },
      singapore: { name: 'Node (SIN)', lon: 103.8198, lat: 1.3521 },
      geneva: { name: 'CERN Core (GVA)', lon: 6.1432, lat: 46.2044 },
    };

    // 飞线流向配置
    const flyLineData = [
      // 以北京核心节点为中心向全球流动
      { from: nodes.beijing, to: nodes.newyork },
      { from: nodes.beijing, to: nodes.london },
      { from: nodes.beijing, to: nodes.tokyo },
      { from: nodes.beijing, to: nodes.sydney },
      { from: nodes.beijing, to: nodes.frankfurt },
      { from: nodes.beijing, to: nodes.singapore },
      { from: nodes.beijing, to: nodes.geneva },
      // 其它骨干网络连接
      { from: nodes.sf, to: nodes.tokyo },
      { from: nodes.newyork, to: nodes.london },
      { from: nodes.frankfurt, to: nodes.geneva },
      { from: nodes.rio, to: nodes.capetown },
      { from: nodes.singapore, to: nodes.sydney },
    ];

    // 自定义飞线样式，支持不同流向呈现深浅交织的科技感
    const formattedLines = flyLineData.map((line, idx) => {
      const isCore = line.from.name.includes('Core') || line.to.name.includes('Core');
      return {
        from: {
          lon: line.from.lon,
          lat: line.from.lat,
          id: `node-${idx}-from`,
          style: {
            color: isCore ? '#00f6ff' : '#00aaff',
            duration: 2000 + Math.random() * 1500,
            delay: Math.random() * 800,
          },
        },
        to: {
          lon: line.to.lon,
          lat: line.to.lat,
          id: `node-${idx}-to`,
        },
        style: {
          pathStyle: {
            color: isCore ? 'rgba(0, 246, 255, 0.15)' : 'rgba(0, 170, 255, 0.12)',
            size: isCore ? 1.2 : 0.8,
          },
          flyLineStyle: {
            color: isCore ? '#00ffcc' : '#33ccff',
            size: isCore ? 3.8 : 2.5,
          },
        },
      };
    });

    // 写入飞线和城市脉冲点数据
    await this.chartScene.setData('flyLine', formattedLines);
  }

  start(): void {
    // 动画自启动
  }

  stop(): void {
    if (this.chartScene && this.chartScene.animationFrameId) {
      cancelAnimationFrame(this.chartScene.animationFrameId);
      this.chartScene.animationFrameId = null;
    }
  }

  resize(): void {
    if (this.chartScene) {
      const width = this.container.clientWidth;
      const height = this.container.clientHeight;
      this.chartScene.renderer.setSize(width, height);
      (this.chartScene.camera as any).aspect = width / height;
      (this.chartScene.camera as any).updateProjectionMatrix();
    }
  }

  destroy(): void {
    if (this.chartScene) {
      // 完美清理内存与对象
      this.chartScene.destroy();
      this.chartScene = null;
    }
  }
}
