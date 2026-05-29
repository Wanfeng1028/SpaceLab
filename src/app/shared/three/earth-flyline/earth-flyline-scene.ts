import ChartScene from '../globe-stream/lib/chartScene';
import MapStore from '../globe-stream/lib/store/mapStore';
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
    // 1. 注册世界地图 GeoJSON (这是确保地图边界线条能渲染出来的核心关键点)
    MapStore.registerMap('world', worldJSON.features as any[]);

    // 2. 完美的 3D 旋转蓝色科技地球视效参数，严格对标 地球.mp4 的色彩表现
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
          path: 'three/globe-stream/image/map.svg', // 离线地图贴图路径，此时已在 public/three/globe-stream/image/ 下，免去 404
          mixed: false,
        },
        earth: {
          material: 'MeshPhongMaterial',
          color: '#04051b', // 视频中的暗海蓝色
          dragConfig: {
            rotationSpeed: 0.35,
            inertiaFactor: 0.95,
            disableX: false,
            disableY: true, // 仅允许水平拖拽自转，体验更好
          },
        },
        bgStyle: {
          color: '#040d21',
          opacity: 0, // 透明背景，使用宿主外部 CSS 渐变
        },
        mapStyle: {
          areaColor: '#013e87', // 视频同款亮蓝色大洲填充
          lineColor: '#516aaf', // 视频同款亮青蓝色边界线
          opacity: 1.0,
        },
        spriteStyle: {
          color: '#003f60', // 柔和蓝色光晕
          show: true,
          size: 2.5,
        },
        pathStyle: {
          color: '#337ca7', // 飞线轨迹线颜色
          size: 1,
          show: true,
        },
        flyLineStyle: {
          color: '#10f9af', // 视频中明亮耀眼的青绿色动态蝌蚪飞线
          size: 3.5,
        },
        scatterStyle: {
          color: '#10f9af', // 视频中的城市脉冲发光点及涟漪
          show: true,
          size: R_value * 0.045,
        },
      },
    };

    // 3. 初始化场景实例
    this.chartScene = new ChartScene(chartOptions);

    // 4. 接入对标视频的全球真实的骨干飞线流量数据
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
      singapore: { name: 'Node (SIN)', lon: 103.8198, lat: 1.3521 },
      geneva: { name: 'CERN Core (GVA)', lon: 6.1432, lat: 46.2044 },
    };

    // 飞线流向配置
    const flyLineData = [
      { from: nodes.beijing, to: nodes.newyork },
      { from: nodes.beijing, to: nodes.london },
      { from: nodes.beijing, to: nodes.tokyo },
      { from: nodes.beijing, to: nodes.sydney },
      { from: nodes.beijing, to: nodes.frankfurt },
      { from: nodes.beijing, to: nodes.singapore },
      { from: nodes.beijing, to: nodes.geneva },
      // 其它骨干连接
      { from: nodes.newyork, to: nodes.london },
      { from: nodes.singapore, to: nodes.sydney },
    ];

    // 格式化飞线样式数据
    const formattedLines = flyLineData.map((line) => {
      return {
        from: {
          lon: line.from.lon,
          lat: line.from.lat,
          style: {
            color: '#10f9af',
            duration: 2000 + Math.random() * 1500,
            delay: Math.random() * 600,
          },
        },
        to: {
          lon: line.to.lon,
          lat: line.to.lat,
        },
      };
    });

    // 载入飞线数据
    await this.chartScene.setData('flyLine', formattedLines);

    // 载入地名文本标识，对标视频中的城市标记
    await this.chartScene.setData('textMark', [
      {
        text: 'PEK',
        position: { lon: 116.4, lat: 42.0 },
        style: { fontSize: 16, color: '#10f9af' },
      },
      {
        text: 'NYC',
        position: { lon: -74.0, lat: 43.5 },
        style: { fontSize: 16, color: '#10f9af' },
      },
      {
        text: 'LHR',
        position: { lon: -0.1, lat: 53.5 },
        style: { fontSize: 16, color: '#10f9af' },
      },
      {
        text: 'NRT',
        position: { lon: 139.6, lat: 38.0 },
        style: { fontSize: 16, color: '#10f9af' },
      },
    ]);
  }

  start(): void {
    // ChartScene 内部在 init 时已开始渲染动画
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
      this.chartScene.destroy();
      this.chartScene = null;
    }
  }
}
