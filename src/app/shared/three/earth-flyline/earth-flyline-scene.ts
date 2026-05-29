import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  SphereGeometry,
  BufferGeometry,
  Float32BufferAttribute,
  ShaderMaterial,
  Mesh,
  MeshBasicMaterial,
  MeshPhongMaterial,
  Points,
  Group,
  Clock,
  AdditiveBlending,
  Color,
  Vector3,
  QuadraticBezierCurve3,
  Line,
  LineBasicMaterial,
  RingGeometry,
  DoubleSide,
  BackSide,
} from 'three';

import worldJSON from '../globe-stream/map/world.json';

const DEG = Math.PI / 180;

function latLngToVec3(lat: number, lng: number, r: number): Vector3 {
  const phi = (90 - lat) * DEG;
  const theta = (lng + 180) * DEG;
  return new Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta),
  );
}

function createCirclePoints(radius: number, segments = 64): Vector3[] {
  const points: Vector3[] = [];
  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * Math.PI * 2;
    points.push(new Vector3(Math.cos(theta) * radius, 0, Math.sin(theta) * radius));
  }
  return points;
}

interface PulsingRing {
  mesh: Mesh;
  scale: number;
  maxScale: number;
  speed: number;
}

interface TelemetryStream {
  curve: QuadraticBezierCurve3;
  geom: BufferGeometry;
  speed: number;
  offset: number;
}

export interface EarthFlylineOptions {
  autoRotate?: boolean;
}

export class EarthFlylineScene {
  private scene!: Scene;
  private camera!: PerspectiveCamera;
  private renderer!: WebGLRenderer;
  private globeGroup!: Group;
  private clock!: Clock;

  private animationId: number | null = null;
  private resizeHandler!: () => void;
  private mouseMoveHandler!: (e: MouseEvent) => void;
  private disposed = false;
  private contextLostHandler: ((e: Event) => void) | null = null;

  // Starfield and drifting cosmic dust
  private starfield: Points | null = null;
  private cosmicDust: Points | null = null;

  // Orbiting digital telemetry rings
  private scanningRingEquator!: Line;
  private scanningRingPolar!: Line;
  private satelliteMesh!: Mesh;

  // Pulsing city nodes radar rings
  private pulsingRings: PulsingRing[] = [];

  // Fading tadpole telemetry streams
  private telemetryStreams: TelemetryStream[] = [];

  // Parallax rotation properties
  private mouseX = 0;
  private mouseY = 0;
  private targetRotX = 0;
  private targetRotY = 0;

  private readonly isMobile: boolean;
  private readonly prefersReducedMotion: boolean;
  private readonly speedFactor: number;

  constructor(
    private canvas: HTMLCanvasElement,
    options: EarthFlylineOptions = {},
  ) {
    this.isMobile = window.innerWidth < 768;
    this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.speedFactor = this.prefersReducedMotion ? 0.05 : 1.0;
    this.clock = new Clock();
  }

  init(): void {
    this.initScene();
    this.bindEvents();
    this.animate();
  }

  private initScene(): void {
    this.scene = new Scene();

    // 1. 设置极具空间感的 Perspective Camera 视野
    this.camera = new PerspectiveCamera(42, 1, 0.1, 200);
    this.camera.position.set(0, 0.1, this.isMobile ? 10.5 : 8.8);

    this.renderer = new WebGLRenderer({
      canvas: this.canvas,
      antialias: !this.isMobile,
      alpha: true, // 透明背景配合宿主 CSS 深度星空渐变
      powerPreference: 'high-performance',
    });

    this.contextLostHandler = (e: Event) => e.preventDefault();
    this.renderer.domElement.addEventListener('webglcontextlost', this.contextLostHandler);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);

    this.globeGroup = new Group();
    this.scene.add(this.globeGroup);

    // 2. 构造 3D 地球核心（完美避开扁平 2D 贴图）
    const R_value = this.isMobile ? 1.9 : 2.3;
    this.buildGlowingGlobe(R_value);

    // 3. 构造太空中包围的流光星云和粒子
    this.createSpaceStarfield();
    this.createCosmicDust(R_value);
  }

  private buildGlowingGlobe(R: number): void {
    // A. 创建不透明的深黑色地球阻隔体 (Occlusion Sphere)
    // 这是核心防穿帮关键：遮挡地球背面旋转过去的线条，使正面大陆轮廓更加清晰分明
    const earthGeom = new SphereGeometry(R * 0.998, 48, 32);
    const earthMat = new MeshPhongMaterial({
      color: 0x02040b, // 极致深邃的黑蓝深渊色
      transparent: false,
      shininess: 12,
      specular: 0x07112a,
    });
    const earthMesh = new Mesh(earthGeom, earthMat);
    this.globeGroup.add(earthMesh);

    // B. 解析 world.json，将全球地理边界以高精度 3D 霓虹线条轮廓在球面绘制！
    const borderGroup = new Group();
    this.globeGroup.add(borderGroup);

    worldJSON.features.forEach((feature: any) => {
      const geomType = feature.geometry.type;
      const coords = feature.geometry.coordinates;

      const drawPolygon = (polygonCoords: any[]) => {
        const points: Vector3[] = [];
        polygonCoords.forEach((ring: any[]) => {
          ring.forEach((coord: number[]) => {
            const lng = coord[0];
            const lat = coord[1];
            points.push(latLngToVec3(lat, lng, R * 1.001));
          });
        });
        if (points.length > 0) {
          const geo = new BufferGeometry().setFromPoints(points);
          const mat = new LineBasicMaterial({
            color: 0x3b82f6, // 极致优雅的高科技霓虹宝蓝色
            transparent: true,
            opacity: 0.38,
            blending: AdditiveBlending,
          });
          const line = new Line(geo, mat);
          borderGroup.add(line);
        }
      };

      if (geomType === 'Polygon') {
        drawPolygon(coords);
      } else if (geomType === 'MultiPolygon') {
        coords.forEach((polygonCoords: any[]) => {
          drawPolygon(polygonCoords);
        });
      }
    });

    // C. 创造多重发光大气圈 (Atmosphere Glow) - 严格对标电影画质发光
    const atmoGeom = new SphereGeometry(R * 1.12, 48, 32);
    const atmoMat = new ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vWorldPos;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uGlowColor;
        uniform float uPower;
        uniform float uIntensity;
        varying vec3 vNormal;
        varying vec3 vWorldPos;
        void main() {
          vec3 viewDir = normalize(cameraPosition - vWorldPos);
          float intensity = pow(1.0 + dot(viewDir, vNormal), uPower);
          gl_FragColor = vec4(uGlowColor, intensity * uIntensity);
        }
      `,
      uniforms: {
        uGlowColor: { value: new Color(0x0088ff) }, // 梦幻的极光蔚蓝色
        uPower: { value: 3.8 },
        uIntensity: { value: 0.72 },
      },
      side: BackSide,
      blending: AdditiveBlending,
      transparent: true,
      depthWrite: false,
    });
    const atmosphere = new Mesh(atmoGeom, atmoMat);
    this.globeGroup.add(atmosphere);

    // D. 注册全球核心枢纽节点，生成 3D 路径、脉冲雷达雷达波及流光飞线
    this.setupFlylineData(R);
  }

  private setupFlylineData(R: number): void {
    // 全球学术与 SpaceLab 神经网络核心节点经纬度坐标
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

    const flyLines = [
      { from: nodes.beijing, to: nodes.newyork },
      { from: nodes.beijing, to: nodes.london },
      { from: nodes.beijing, to: nodes.tokyo },
      { from: nodes.beijing, to: nodes.sydney },
      { from: nodes.beijing, to: nodes.frankfurt },
      { from: nodes.beijing, to: nodes.singapore },
      { from: nodes.beijing, to: nodes.geneva },
      { from: nodes.newyork, to: nodes.london },
      { from: nodes.singapore, to: nodes.sydney },
    ];

    // 1. 创建城市发光核心与脉冲雷达波
    const allCities = Array.from(new Set(flyLines.flatMap((line) => [line.from, line.to])));

    allCities.forEach((city) => {
      const v = latLngToVec3(city.lat, city.lon, R * 1.002);

      // 城市核心发光点精灵
      const dotGeom = new BufferGeometry();
      dotGeom.setAttribute('position', new Float32BufferAttribute([v.x, v.y, v.z], 3));
      const dotMat = new ShaderMaterial({
        vertexShader: `
          void main() {
            vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = 12.0 * (80.0 / -mvPos.z);
            gl_Position = projectionMatrix * mvPos;
          }
        `,
        fragmentShader: `
          void main() {
            float d = length(gl_PointCoord - 0.5) * 2.0;
            float alpha = smoothstep(1.0, 0.0, d);
            gl_FragColor = vec4(0.06, 0.98, 0.68, alpha * 0.95); // 极致闪耀的数字青绿
          }
        `,
        transparent: true,
        blending: AdditiveBlending,
        depthWrite: false,
      });
      const cityPoint = new Points(dotGeom, dotMat);
      this.globeGroup.add(cityPoint);

      // staggered 双层 concentric pulsing 脉冲雷达发光环，超高清对标
      for (let k = 0; k < 2; k++) {
        const ringGeom = new RingGeometry(0.01, 0.16, 32);
        const ringMat = new MeshBasicMaterial({
          color: 0x10f9af, // 赛博发光数字青色
          side: DoubleSide,
          transparent: true,
          opacity: 0.8,
          depthWrite: false,
          blending: AdditiveBlending,
        });
        const ringMesh = new Mesh(ringGeom, ringMat);
        ringMesh.position.copy(v);
        ringMesh.quaternion.setFromUnitVectors(new Vector3(0, 0, 1), v.clone().normalize());
        this.globeGroup.add(ringMesh);

        this.pulsingRings.push({
          mesh: ringMesh,
          scale: 0.1 + k * 0.85,
          maxScale: 1.7,
          speed: 0.55 + Math.random() * 0.2,
        });
      }
    });

    // 2. 构造 3D 弧线轨道和渐变飞线 tadpole 移动微粒流
    flyLines.forEach((line, idx) => {
      const start = latLngToVec3(line.from.lat, line.from.lon, R);
      const end = latLngToVec3(line.to.lat, line.to.lon, R);

      // 弧形控制点高度计算
      const mid = start.clone().add(end).multiplyScalar(0.5);
      const dist = start.distanceTo(end);
      const control = mid.normalize().multiplyScalar(R + dist * 0.38);

      const curve = new QuadraticBezierCurve3(start, control, end);

      // 绘制静止的纤细弧形轨迹线条
      const pathPoints = curve.getPoints(50);
      const pathGeom = new BufferGeometry().setFromPoints(pathPoints);
      const pathMat = new LineBasicMaterial({
        color: 0x1e3a8a, // 优雅的幽暗蓝，极富细节但不抢镜
        transparent: true,
        opacity: 0.35,
      });
      const pathLine = new Line(pathGeom, pathMat);
      this.globeGroup.add(pathLine);

      // 构建流光飞线点云 (12 个粒子，头部大，尾部渐变缩小且淡出)
      const particleCount = 12;
      const alphas = new Float32Array(particleCount);
      const sizes = new Float32Array(particleCount);

      for (let j = 0; j < particleCount; j++) {
        alphas[j] = 1.0 - j / particleCount; // 彗星拖尾尾部淡出
        sizes[j] = 1.0 - (j / particleCount) * 0.55; // 尾部彗尾缩小
      }

      const streamGeom = new BufferGeometry();
      streamGeom.setAttribute(
        'position',
        new Float32BufferAttribute(new Float32Array(particleCount * 3), 3),
      );
      streamGeom.setAttribute('aAlpha', new Float32BufferAttribute(alphas, 1));
      streamGeom.setAttribute('aSize', new Float32BufferAttribute(sizes, 1));

      const streamMat = new ShaderMaterial({
        uniforms: {
          uColor: { value: new Color(0x10f9af) }, // 彗尾同款高科技青绿流光
        },
        vertexShader: `
          attribute float aAlpha;
          attribute float aSize;
          varying float vAlpha;
          void main() {
            vAlpha = aAlpha;
            vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = aSize * (35.0 / -mvPos.z);
            gl_Position = projectionMatrix * mvPos;
          }
        `,
        fragmentShader: `
          uniform vec3 uColor;
          varying float vAlpha;
          void main() {
            float d = length(gl_PointCoord - 0.5) * 2.0;
            float alpha = smoothstep(1.0, 0.0, d) * vAlpha;
            gl_FragColor = vec4(uColor, alpha);
          }
        `,
        transparent: true,
        blending: AdditiveBlending,
        depthWrite: false,
      });

      const streamPoints = new Points(streamGeom, streamMat);
      this.globeGroup.add(streamPoints);

      this.telemetryStreams.push({
        curve,
        geom: streamGeom,
        speed: 0.16 + Math.random() * 0.1, // 速度微调， staggered
        offset: idx * 0.15, // 时序错开
      });
    });

    // 3. 构建赤道及极地遥测数据诊断环和卫星自转轨道
    this.scanningRingEquator = new Line(
      new BufferGeometry().setFromPoints(createCirclePoints(R * 1.25)),
      new LineBasicMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.22 }),
    );
    this.scanningRingEquator.rotation.x = Math.PI / 2;
    this.globeGroup.add(this.scanningRingEquator);

    this.scanningRingPolar = new Line(
      new BufferGeometry().setFromPoints(createCirclePoints(R * 1.26)),
      new LineBasicMaterial({ color: 0x1d4ed8, transparent: true, opacity: 0.15 }),
    );
    this.scanningRingPolar.rotation.y = Math.PI / 4;
    this.globeGroup.add(this.scanningRingPolar);

    // 轨道小卫星
    const satGeom = new SphereGeometry(0.045, 8, 8);
    const satMat = new MeshBasicMaterial({
      color: 0x10f9af,
      blending: AdditiveBlending,
    });
    this.satelliteMesh = new Mesh(satGeom, satMat);
    this.globeGroup.add(this.satelliteMesh);
  }

  private createSpaceStarfield(): void {
    const count = this.isMobile ? 400 : 900;
    const positions = new Float32Array(count * 3);
    const alphas = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 90;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 90;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 80 - 15;
      alphas[i] = 0.3 + Math.random() * 0.7;
    }

    const geom = new BufferGeometry();
    geom.setAttribute('position', new Float32BufferAttribute(positions, 3));
    geom.setAttribute('aAlpha', new Float32BufferAttribute(alphas, 1));

    const mat = new ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: `
        attribute float aAlpha;
        varying float vAlpha;
        void main() {
          vAlpha = aAlpha;
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = 1.3 * (80.0 / -mvPos.z);
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying float vAlpha;
        void main() {
          float d = length(gl_PointCoord - 0.5) * 2.0;
          float alpha = smoothstep(1.0, 0.0, d) * vAlpha;
          float twinkle = sin(uTime * 1.6 + vAlpha * 100.0) * 0.38 + 0.62;
          gl_FragColor = vec4(vec3(0.92, 0.95, 1.0), alpha * twinkle * 0.55);
        }
      `,
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
    });

    this.starfield = new Points(geom, mat);
    this.scene.add(this.starfield);
  }

  private createCosmicDust(R: number): void {
    const count = this.isMobile ? 250 : 600;
    const positions = new Float32Array(count * 3);
    const alphas = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const r = R * (1.3 + Math.random() * 1.5);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
      alphas[i] = 0.2 + Math.random() * 0.6;
    }

    const geom = new BufferGeometry();
    geom.setAttribute('position', new Float32BufferAttribute(positions, 3));
    geom.setAttribute('aAlpha', new Float32BufferAttribute(alphas, 1));

    const mat = new ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: `
        attribute float aAlpha;
        varying float vAlpha;
        void main() {
          vAlpha = aAlpha;
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = 1.0 * (60.0 / -mvPos.z);
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying float vAlpha;
        void main() {
          float d = length(gl_PointCoord - 0.5) * 2.0;
          float alpha = smoothstep(1.0, 0.0, d) * vAlpha;
          gl_FragColor = vec4(vec3(0.2, 0.6, 1.0), alpha * 0.25);
        }
      `,
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
    });

    this.cosmicDust = new Points(geom, mat);
    this.globeGroup.add(this.cosmicDust);
  }

  private bindEvents(): void {
    this.resizeHandler = () => this.resizeRenderer();
    window.addEventListener('resize', this.resizeHandler);

    this.mouseMoveHandler = (e: MouseEvent) => {
      this.mouseX = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouseY = -(e.clientY / window.innerHeight) * 2 + 1;

      this.targetRotY = this.mouseX * 0.22;
      this.targetRotX = -this.mouseY * 0.15;
    };
    window.addEventListener('mousemove', this.mouseMoveHandler);
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
    const sf = this.speedFactor;

    // 1. 鼠标悬停视差微动平滑插值自转
    this.globeGroup.rotation.y =
      this.globeGroup.rotation.y + (this.targetRotY - this.globeGroup.rotation.y) * 0.05 * sf;
    this.globeGroup.rotation.x =
      this.globeGroup.rotation.x + (this.targetRotX - this.globeGroup.rotation.x) * 0.05 * sf;

    // 缓慢自动巡航自转
    this.globeGroup.rotation.y += 0.003 * sf;

    // 2. 驱动 tadpole 渐变飞线点流动
    this.telemetryStreams.forEach((stream) => {
      const t = (((elapsed * stream.speed + stream.offset) % 1.0) + 1.0) % 1.0;
      const posAttr = stream.geom.getAttribute('position') as Float32BufferAttribute;

      for (let j = 0; j < 12; j++) {
        const p = Math.max(0.0, Math.min(1.0, t - j * 0.015));
        const vec = stream.curve.getPoint(p);
        posAttr.setXYZ(j, vec.x, vec.y, vec.z);
      }
      posAttr.needsUpdate = true;
    });

    // 3. 驱动城市脉冲发光雷达环
    this.pulsingRings.forEach((ring) => {
      ring.scale += ring.speed * 0.016 * sf;
      if (ring.scale > ring.maxScale) {
        ring.scale = 0.1;
      }
      ring.mesh.scale.setScalar(ring.scale);

      // 渐出计算
      const opacity = 1.0 - ring.scale / ring.maxScale;
      (ring.mesh.material as MeshBasicMaterial).opacity = opacity * 0.85;
    });

    // 4. 驱动小卫星在赤道轨道上环绕飞行
    if (this.satelliteMesh) {
      const angle = elapsed * 0.5 * sf;
      const R_satellite = this.isMobile ? 1.9 * 1.25 : 2.3 * 1.25;
      this.satelliteMesh.position.set(
        Math.cos(angle) * R_satellite,
        0,
        Math.sin(angle) * R_satellite,
      );
      // 卫星赤道轨道缓慢旋转微调
      this.scanningRingEquator.rotation.z = elapsed * 0.05 * sf;
    }

    // 5. 驱动星尘缓慢旋转
    if (this.cosmicDust) {
      this.cosmicDust.rotation.y = elapsed * 0.01 * sf;
    }

    // 6. 更新各 Shader 的 Time uniform
    if (this.starfield && this.starfield.material) {
      (this.starfield.material as ShaderMaterial).uniforms.uTime.value = elapsed;
    }

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
    if (this.contextLostHandler) {
      this.renderer.domElement.removeEventListener('webglcontextlost', this.contextLostHandler);
      this.contextLostHandler = null;
    }
    this.disposed = true;
    this.pause();
    window.removeEventListener('resize', this.resizeHandler);
    window.removeEventListener('mousemove', this.mouseMoveHandler);

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
    this.pulsingRings = [];
    this.telemetryStreams = [];
    this.starfield = null;
    this.cosmicDust = null;
  }
}
