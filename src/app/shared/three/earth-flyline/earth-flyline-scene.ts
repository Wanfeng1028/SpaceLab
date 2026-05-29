import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  BufferGeometry,
  Float32BufferAttribute,
  Points,
  Group,
  Clock,
  AdditiveBlending,
  Color,
  Vector3,
  CatmullRomCurve3,
  MeshBasicMaterial,
  Mesh,
  SphereGeometry,
  LineBasicMaterial,
  Line,
  LineLoop,
  BufferAttribute,
  PointsMaterial,
} from 'three';
import worldJSON from '../globe-stream/map/world.json';

export interface EarthFlylineOptions {
  autoRotate?: boolean;
}

interface TelemetryPacket {
  curve: CatmullRomCurve3;
  mesh: Mesh;
  speed: number;
  progress: number;
}

export class EarthFlylineScene {
  private scene!: Scene;
  private camera!: PerspectiveCamera;
  private renderer!: WebGLRenderer;
  private clock!: Clock;
  private mainGroup!: Group;
  private globeGroup!: Group;
  private ringsGroup!: Group;

  private animationId: number | null = null;
  private resizeHandler!: () => void;
  private disposed = false;

  private packets: TelemetryPacket[] = [];
  private isMobile: boolean;

  constructor(
    private canvas: HTMLCanvasElement,
    private options: EarthFlylineOptions = {},
  ) {
    this.isMobile = window.innerWidth < 768;
    this.clock = new Clock();
  }

  init(): void {
    this.initScene();
    this.bindEvents();
    this.animate();
  }

  private initScene(): void {
    this.scene = new Scene();

    // Setup camera dynamically based on screen size
    this.camera = new PerspectiveCamera(45, 1, 0.1, 1000);
    this.camera.position.set(0, 0, this.isMobile ? 320 : 280);

    this.renderer = new WebGLRenderer({
      canvas: this.canvas,
      antialias: !this.isMobile,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
    this.renderer.setClearColor(0x000000, 0); // Transparent to show container gradient

    this.mainGroup = new Group();
    this.scene.add(this.mainGroup);

    this.globeGroup = new Group();
    this.mainGroup.add(this.globeGroup);

    this.ringsGroup = new Group();
    this.mainGroup.add(this.ringsGroup);

    const R_value = this.isMobile ? 80 : 100;

    // 1. 深度遮挡内心球 (Inner Depth occlusion sphere)
    // 阻止背面的全息粒子过度叠加，形成逼真的 3D 厚度与空间感
    const innerGeom = new SphereGeometry(R_value * 0.98, 32, 32);
    const innerMat = new MeshBasicMaterial({
      color: 0x040a1b,
      transparent: true,
      opacity: 0.9,
      depthWrite: true,
    });
    const innerSphere = new Mesh(innerGeom, innerMat);
    this.globeGroup.add(innerSphere);

    // 2. 构造 3D 全息粒子大洋洲/美洲/欧亚大陆 (Holographic Continent Borders)
    this.buildHolographicContinents(R_value);

    // 3. 构造 3D 诊断扫描光环与游走卫星 (Scanning Diagnostic Rings)
    this.buildDiagnosticRings(R_value);

    // 4. 构造全球科技骨干节点的发光点与交互脉冲波 (Global City Scatters)
    this.buildCityNodes(R_value);

    // 5. 构造 3D 贝塞尔流光飞线与数据微粒包 (Bezier Curved Streams)
    this.buildFlowingTelemetry(R_value);

    // 6. 构造外层发光全息层
    const atmosphereGeom = new SphereGeometry(R_value * 1.05, 32, 32);
    const atmosphereMat = new MeshBasicMaterial({
      color: 0x0066ff,
      transparent: true,
      opacity: 0.12,
      blending: AdditiveBlending,
      depthWrite: false,
    });
    const atmosphere = new Mesh(atmosphereGeom, atmosphereMat);
    this.globeGroup.add(atmosphere);

    // 7. 星空微粒背景 (Space telemetry dust)
    this.buildSpaceDust();
  }

  // 经纬度转 3D 空间直角坐标
  private lon2xyz(R: number, lon: number, lat: number): Vector3 {
    const radLon = (lon * Math.PI) / 180;
    const radLat = (lat * Math.PI) / 180;

    // Standard spherical coordinates
    const x = -R * Math.cos(radLat) * Math.sin(radLon);
    const y = R * Math.sin(radLat);
    const z = R * Math.cos(radLat) * Math.cos(radLon);

    return new Vector3(x, y, z);
  }

  // 解析 world.json 并在 3D 球面上建立炫酷的全息粒子大陆边缘
  private buildHolographicContinents(R: number): void {
    const positions: number[] = [];
    const colors: number[] = [];
    const baseColor = new Color('#00aaff'); // 全息青蓝色

    const addPolygonPoints = (ring: number[][]) => {
      // 提取点并添加至点集
      ring.forEach((coord, idx) => {
        // 降低点密度，保证流畅度且具有数字网格感
        if (this.isMobile && idx % 2 !== 0) return;

        const lon = coord[0];
        const lat = coord[1];
        const { x, y, z } = this.lon2xyz(R, lon, lat);
        positions.push(x, y, z);

        // 赋予微妙的明暗数字抖动色
        const c = baseColor.clone().multiplyScalar(0.6 + Math.random() * 0.45);
        colors.push(c.r, c.g, c.b);
      });
    };

    worldJSON.features.forEach((feature: any) => {
      const geom = feature.geometry;
      if (!geom) return;
      if (geom.type === 'Polygon') {
        geom.coordinates.forEach((ring: number[][]) => addPolygonPoints(ring));
      } else if (geom.type === 'MultiPolygon') {
        geom.coordinates.forEach((poly: number[][][]) => {
          poly.forEach((ring: number[][]) => addPolygonPoints(ring));
        });
      }
    });

    const geom = new BufferGeometry();
    geom.setAttribute('position', new Float32BufferAttribute(positions, 3));
    geom.setAttribute('color', new Float32BufferAttribute(colors, 3));

    const mat = new PointsMaterial({
      size: this.isMobile ? 1.0 : 1.4,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: AdditiveBlending,
      depthWrite: false,
    });

    const pointCloud = new Points(geom, mat);
    pointCloud.name = 'continents';
    this.globeGroup.add(pointCloud);
  }

  // 绘制赤道和两极的科幻诊断环圈与追踪卫星
  private buildDiagnosticRings(R: number): void {
    // 1. 赤道环 (Equatorial Ring)
    const ringRadius = R * 1.25;
    const segments = 120;
    const ringGeom = new BufferGeometry();
    const ringPositions: number[] = [];

    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      ringPositions.push(Math.cos(theta) * ringRadius, 0, Math.sin(theta) * ringRadius);
    }

    ringGeom.setAttribute('position', new Float32BufferAttribute(ringPositions, 3));
    const ringMat = new LineBasicMaterial({
      color: 0x0055ff,
      transparent: true,
      opacity: 0.28,
      blending: AdditiveBlending,
    });

    const equatorialRing = new LineLoop(ringGeom, ringMat);
    this.ringsGroup.add(equatorialRing);

    // 2. 两极追踪轨道 (Polar Ring)
    const polarRing = equatorialRing.clone();
    polarRing.rotation.x = Math.PI / 2;
    this.ringsGroup.add(polarRing);

    // 3. 轨道巡航数据卫星 (Orbiting Data Satellites)
    const satelliteGeom = new SphereGeometry(R * 0.022, 8, 8);
    const satelliteMat = new MeshBasicMaterial({
      color: 0x00ffff,
      blending: AdditiveBlending,
    });

    // 卫星A - 赤道轨道
    const satA = new Mesh(satelliteGeom, satelliteMat);
    satA.position.set(ringRadius, 0, 0);
    satA.name = 'satA';
    this.ringsGroup.add(satA);

    // 卫星B - 极地轨道
    const satB = new Mesh(satelliteGeom, satelliteMat);
    satB.position.set(0, ringRadius, 0);
    satB.name = 'satB';
    this.ringsGroup.add(satB);
  }

  // 放置科技感发光的网络骨干节点与脉冲涟漪
  private buildCityNodes(R: number): void {
    const cities = [
      { name: 'PEK', lon: 116.4074, lat: 39.9042 }, // Beijing
      { name: 'NYC', lon: -74.006, lat: 40.7128 }, // New York
      { name: 'LHR', lon: -0.1278, lat: 51.5074 }, // London
      { name: 'NRT', lon: 139.6917, lat: 35.6762 }, // Tokyo
      { name: 'SYD', lon: 151.2093, lat: -33.8688 }, // Sydney
      { name: 'FRA', lon: 8.6821, lat: 50.1109 }, // Frankfurt
      { name: 'SIN', lon: 103.8198, lat: 1.3521 }, // Singapore
      { name: 'GVA', lon: 6.1432, lat: 46.2044 }, // Geneva
    ];

    const positions: number[] = [];
    const sizes: number[] = [];

    cities.forEach((city) => {
      const pos = this.lon2xyz(R * 1.002, city.lon, city.lat);
      positions.push(pos.x, pos.y, pos.z);
      sizes.push(4.5); // 节点大点发光

      // 附加自发光的静态小球，增强立体层次
      const nodeGeom = new SphereGeometry(R * 0.015, 8, 8);
      const nodeMat = new MeshBasicMaterial({
        color: 0x00ffdd,
        transparent: true,
        opacity: 0.9,
        blending: AdditiveBlending,
      });
      const nodeMesh = new Mesh(nodeGeom, nodeMat);
      nodeMesh.position.copy(pos);
      this.globeGroup.add(nodeMesh);
    });

    const geom = new BufferGeometry();
    geom.setAttribute('position', new Float32BufferAttribute(positions, 3));

    const mat = new PointsMaterial({
      size: this.isMobile ? 6 : 9,
      color: 0x00ffdd,
      transparent: true,
      opacity: 0.85,
      blending: AdditiveBlending,
      depthWrite: false,
    });

    const nodesCloud = new Points(geom, mat);
    this.globeGroup.add(nodesCloud);
  }

  // 编织全球数据流动的 3D 贝塞尔飞线，及沿线高速疾驰的数据火花包
  private buildFlowingTelemetry(R: number): void {
    const nodes = {
      beijing: new Vector3().copy(this.lon2xyz(R, 116.4074, 39.9042)),
      newyork: new Vector3().copy(this.lon2xyz(R, -74.006, 40.7128)),
      london: new Vector3().copy(this.lon2xyz(R, -0.1278, 51.5074)),
      tokyo: new Vector3().copy(this.lon2xyz(R, 139.6917, 35.6762)),
      sydney: new Vector3().copy(this.lon2xyz(R, 151.2093, -33.8688)),
      frankfurt: new Vector3().copy(this.lon2xyz(R, 8.6821, 50.1109)),
      singapore: new Vector3().copy(this.lon2xyz(R, 103.8198, 1.3521)),
      geneva: new Vector3().copy(this.lon2xyz(R, 6.1432, 46.2044)),
    };

    const routes = [
      { from: nodes.beijing, to: nodes.newyork },
      { from: nodes.beijing, to: nodes.london },
      { from: nodes.beijing, to: nodes.tokyo },
      { from: nodes.beijing, to: nodes.sydney },
      { from: nodes.beijing, to: nodes.frankfurt },
      { from: nodes.beijing, to: nodes.singapore },
      { from: nodes.beijing, to: nodes.geneva },
      // 支线
      { from: nodes.london, to: nodes.newyork },
      { from: nodes.tokyo, to: nodes.singapore },
      { from: nodes.frankfurt, to: nodes.geneva },
      { from: nodes.singapore, to: nodes.sydney },
    ];

    routes.forEach((route, idx) => {
      const src = route.from;
      const dest = route.to;

      // 1. 计算两点之间的中弧点并向外扩张
      const mid = new Vector3().addVectors(src, dest).multiplyScalar(0.5);
      const dist = src.distanceTo(dest);
      const arcHeight = dist * 0.28; // 弧度高度比例
      mid.normalize().multiplyScalar(R + arcHeight);

      // 2. 建立光滑的三点贝塞尔曲线
      const curve = new CatmullRomCurve3([src, mid, dest]);
      const pathPoints = curve.getPoints(this.isMobile ? 32 : 64);

      const pathGeom = new BufferGeometry().setFromPoints(pathPoints);
      const pathMat = new LineBasicMaterial({
        color: 0x0088ff,
        transparent: true,
        opacity: 0.16,
        blending: AdditiveBlending,
      });

      const routeLine = new Line(pathGeom, pathMat);
      this.globeGroup.add(routeLine);

      // 3. 建立沿着曲线高速滑行的数据能量火花小球
      const sparkGeom = new SphereGeometry(R * 0.015, 6, 6);
      const sparkMat = new MeshBasicMaterial({
        color: idx % 2 === 0 ? 0x00ffff : 0x00ffcc, // 交替青与亮绿
        transparent: true,
        opacity: 0.9,
        blending: AdditiveBlending,
      });
      const sparkMesh = new Mesh(sparkGeom, sparkMat);
      sparkMesh.position.copy(src);
      this.globeGroup.add(sparkMesh);

      // 保存包数据，在 animate 里沿轨道驱动
      this.packets.push({
        curve,
        mesh: sparkMesh,
        speed: 0.2 + Math.random() * 0.28, // 随机流动速度
        progress: Math.random(), // 随机起始进度，使流动交错错开
      });
    });
  }

  // 构造太空中漂浮的信息微尘粒子背景
  private buildSpaceDust(): void {
    const count = this.isMobile ? 300 : 700;
    const positions: number[] = [];
    const sizes: number[] = [];

    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 500;
      const y = (Math.random() - 0.5) * 500;
      const z = (Math.random() - 0.5) * 500 - 150;
      positions.push(x, y, z);
      sizes.push(1.0 + Math.random() * 2.0);
    }

    const geom = new BufferGeometry();
    geom.setAttribute('position', new Float32BufferAttribute(positions, 3));

    const mat = new PointsMaterial({
      size: 1.5,
      color: 0x00aaff,
      transparent: true,
      opacity: 0.35,
      blending: AdditiveBlending,
      depthWrite: false,
    });

    const dust = new Points(geom, mat);
    this.scene.add(dust);
  }

  private bindEvents(): void {
    this.resizeHandler = () => this.resizeRenderer();
    window.addEventListener('resize', this.resizeHandler);
  }

  private resizeRenderer(): void {
    const parent = this.canvas.parentElement;
    if (!parent) return;
    const w = parent.clientWidth;
    const h = parent.clientHeight;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  private animate(): void {
    if (this.disposed) return;
    this.animationId = requestAnimationFrame(() => this.animate());

    const elapsed = this.clock.getElapsedTime();
    const delta = this.clock.getDelta();

    // 1. 全息地球缓慢自转
    if (this.options.autoRotate !== false) {
      this.globeGroup.rotation.y = elapsed * 0.045;
    }

    // 2. 赤道扫描诊断轨道与卫星反方向缓慢旋转
    this.ringsGroup.rotation.y = -elapsed * 0.025;

    // 赤道卫星圆周浮动
    const satA = this.ringsGroup.getObjectByName('satA');
    if (satA) {
      const amp = Math.sin(elapsed * 2.0) * 1.5;
      satA.scale.setScalar(1.0 + Math.sin(elapsed * 4.0) * 0.15);
    }

    // 3. 驱动沿着贝塞尔曲线高速滑行的数据能量包
    this.packets.forEach((packet) => {
      packet.progress += packet.speed * 0.016; // 大约按照 60fps 驱动进度
      if (packet.progress >= 1.0) {
        packet.progress = 0;
      }

      const nextPos = packet.curve.getPointAt(packet.progress);
      packet.mesh.position.copy(nextPos);

      // 呼吸发光缩放
      const scale = 0.8 + Math.sin(elapsed * 8.0 + packet.progress * 10) * 0.25;
      packet.mesh.scale.setScalar(scale);
    });

    this.renderer.render(this.scene, this.camera);
  }

  pause(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  resume(): void {
    if (!this.disposed && this.animationId === null) {
      this.clock.getDelta();
      this.animate();
    }
  }

  destroy(): void {
    this.disposed = true;
    this.pause();
    window.removeEventListener('resize', this.resizeHandler);

    this.scene.traverse((obj) => {
      const mesh = obj as any;
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m: any) => m.dispose());
        } else {
          mesh.material.dispose();
        }
      }
    });

    this.renderer.dispose();
    this.packets = [];
  }
}
