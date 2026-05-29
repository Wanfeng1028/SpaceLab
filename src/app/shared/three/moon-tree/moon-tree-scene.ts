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
  Vector2,
  Vector3,
  CatmullRomCurve3,
  ShaderMaterial,
  SphereGeometry,
  MeshBasicMaterial,
  Mesh,
  SpriteMaterial,
  Sprite,
  CanvasTexture,
  LinearFilter,
  TubeGeometry,
} from 'three';

import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

interface BranchConfig {
  points: Vector3[];
}

// 9 organic bionic branch curves radiating from trunk
const BRANCH_CONFIGS: BranchConfig[] = [
  { points: [new Vector3(0.05, 1.8, 0), new Vector3(0.5, 2.3, 0.2), new Vector3(1.3, 2.9, 0.2)] },
  {
    points: [
      new Vector3(-0.05, 1.8, 0),
      new Vector3(-0.6, 2.4, -0.2),
      new Vector3(-1.4, 3.0, -0.3),
    ],
  },
  {
    points: [new Vector3(0.03, 1.6, 0.03), new Vector3(0.8, 2.0, 0.4), new Vector3(1.5, 2.4, 0.7)],
  },
  {
    points: [
      new Vector3(-0.03, 1.6, -0.03),
      new Vector3(-0.7, 2.1, -0.3),
      new Vector3(-1.3, 2.6, -0.8),
    ],
  },
  { points: [new Vector3(0, 2.0, 0.04), new Vector3(0.35, 2.6, 0.6), new Vector3(0.7, 3.2, 1.0)] },
  {
    points: [
      new Vector3(0, 2.0, -0.04),
      new Vector3(-0.4, 2.5, -0.5),
      new Vector3(-0.9, 3.1, -1.0),
    ],
  },
  {
    points: [new Vector3(0.04, 1.3, 0.02), new Vector3(0.6, 1.7, 0.5), new Vector3(1.1, 2.2, 0.9)],
  },
  {
    points: [
      new Vector3(-0.04, 1.3, -0.02),
      new Vector3(-0.5, 1.8, -0.4),
      new Vector3(-1.0, 2.3, -0.7),
    ],
  },
  { points: [new Vector3(0, 2.2, 0), new Vector3(0.08, 2.9, 0.08), new Vector3(0.0, 3.7, 0.0)] },
];

// 5 crown lobe coordinates mapping leaf clusters
const CROWN_LOBES = [
  { cx: 0, cy: 3.6, cz: 0, rx: 2.2, ry: 1.4, rz: 2.2 },
  { cx: 1.4, cy: 3.1, cz: 0.5, rx: 1.7, ry: 1.2, rz: 1.7 },
  { cx: -1.4, cy: 3.1, cz: -0.5, rx: 1.7, ry: 1.2, rz: 1.7 },
  { cx: 0.5, cy: 3.4, cz: 1.4, rx: 1.5, ry: 1.2, rz: 1.5 },
  { cx: -0.5, cy: 3.4, cz: -1.4, rx: 1.5, ry: 1.2, rz: 1.5 },
];

interface Butterfly {
  mesh: Mesh;
  center: Vector3;
  radius: number;
  speed: number;
  offsetY: number;
  phase: number;
}

export class MoonTreeScene {
  private scene!: Scene;
  private camera!: PerspectiveCamera;
  private renderer!: WebGLRenderer;
  private composer!: EffectComposer;
  private treeGroup!: Group;
  private clock!: Clock;

  private animationId: number | null = null;
  private resizeHandler!: () => void;
  private mouseMoveHandler!: (e: MouseEvent) => void;
  private disposed = false;
  private contextLostHandler: ((e: Event) => void) | null = null;

  // Swirling Canopy Particles
  private crownSystems: { points: Points; basePositions: Float32Array; lobe: any }[] = [];

  // Drifting Fireflies & Sparks
  private fireflies: Points | null = null;
  private fireflyBasePositions!: Float32Array;
  private sparks: Points | null = null;
  private sparkPositions!: Float32Array;
  private sparkSpeeds!: Float32Array;

  // Fluttering Bionic Butterflies
  private butterflies: Butterfly[] = [];

  // Mouse Interactivity Parallax
  private mouseX = 0;
  private mouseY = 0;
  private targetRotX = 0;
  private targetRotY = 0;

  private readonly isMobile: boolean;
  private readonly prefersReducedMotion: boolean;
  private readonly speedFactor: number;

  constructor(private canvas: HTMLCanvasElement) {
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

    // Position camera dynamically for optimal sizing
    this.camera = new PerspectiveCamera(42, 1, 0.1, 200);
    this.camera.position.set(0, 1.3, this.isMobile ? 12.5 : 10.5);

    this.renderer = new WebGLRenderer({
      canvas: this.canvas,
      antialias: !this.isMobile,
      alpha: false, // 禁用透明，采用 solid 深黑色天空，避免混合过载造成的白屏 BUG
      powerPreference: 'high-performance',
    });

    this.contextLostHandler = (e: Event) => e.preventDefault();
    this.renderer.domElement.addEventListener('webglcontextlost', this.contextLostHandler);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
    this.renderer.setClearColor(0x020208, 1.0); // 极致深黑蓝色天空

    // 1. 设置 UnrealBloom 梦幻发光后处理，严格校准防曝光过载
    this.composer = new EffectComposer(this.renderer);
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    const bloomPass = new UnrealBloomPass(
      new Vector2(this.canvas.clientWidth, this.canvas.clientHeight),
      1.1, // strength 调低发光强度，防止白色云雾曝光
      0.45, // radius
      0.72, // threshold 提高发光阈值，让叶子边缘颗粒清晰，保留满天繁星沙砾感
    );
    this.composer.addPass(bloomPass);

    const outputPass = new OutputPass();
    this.composer.addPass(outputPass);

    this.treeGroup = new Group();
    this.scene.add(this.treeGroup);

    // 2. 构造 3D 实体仿生发光管道树干 (Bionic Solid Tube Skeleton)
    this.buildBionicSkeleton();

    // 3. 构造 3D 树冠高密度粒子、树干粒子、星空、日食光冕月亮
    this.buildTrunkParticles();
    this.buildBranchParticles();
    this.buildCrownParticles();
    this.buildFireflies();
    this.buildRisingEnergySparks();
    this.buildFlutteringButterflies();
    this.buildMultiLayeredMoon();
    this.buildBackgroundStarField();
  }

  // 动态创建高品质 Canvas 精灵径向发光贴图
  private createGlowTexture(colorHex: string): CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;

    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.2, colorHex);
    grad.addColorStop(0.5, 'rgba(0, 100, 255, 0.12)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);

    const texture = new CanvasTexture(canvas);
    texture.minFilter = LinearFilter;
    return texture;
  }

  private makeParticleMaterial(color: Color, blending = AdditiveBlending): ShaderMaterial {
    return new ShaderMaterial({
      uniforms: { uColor: { value: color } },
      vertexShader: `
        attribute float aSize;
        attribute float aAlpha;
        varying float vAlpha;
        void main() {
          vAlpha = aAlpha;
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * (50.0 / -mvPos.z); // 极致精细粒子缩放大小
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
      blending,
      depthWrite: false,
    });
  }

  private buildParticleGeometry(
    count: number,
    generator: (i: number) => { x: number; y: number; z: number; size: number; alpha: number },
  ): { geom: BufferGeometry; basePositions: Float32Array } {
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const alphas = new Float32Array(count);
    const basePositions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const p = generator(i);
      positions[i * 3] = p.x;
      positions[i * 3 + 1] = p.y;
      positions[i * 3 + 2] = p.z;
      basePositions[i * 3] = p.x;
      basePositions[i * 3 + 1] = p.y;
      basePositions[i * 3 + 2] = p.z;
      sizes[i] = p.size;
      alphas[i] = p.alpha;
    }

    const geom = new BufferGeometry();
    geom.setAttribute('position', new Float32BufferAttribute(positions, 3));
    geom.setAttribute('aSize', new Float32BufferAttribute(sizes, 1));
    geom.setAttribute('aAlpha', new Float32BufferAttribute(alphas, 1));
    return { geom, basePositions };
  }

  // 构造金莹发光的实体仿生管道骨干，内含能量流体材质融合
  private buildBionicSkeleton(): void {
    // 1. 主干实体管道
    const trunkPoints = [
      new Vector3(0, -0.6, 0),
      new Vector3(0.05, 0.7, 0.05),
      new Vector3(-0.06, 1.4, -0.05),
      new Vector3(0, 2.0, 0),
    ];
    const trunkCurve = new CatmullRomCurve3(trunkPoints);
    const trunkGeom = new TubeGeometry(trunkCurve, 20, 0.08, 8, false);
    const trunkMat = new MeshBasicMaterial({
      color: 0x004fff, // 幽蓝光效
      transparent: true,
      opacity: 0.65,
      blending: AdditiveBlending,
    });
    const trunkMesh = new Mesh(trunkGeom, trunkMat);
    this.treeGroup.add(trunkMesh);

    // 2. 九条分叉枝桠实体管道
    BRANCH_CONFIGS.forEach((config) => {
      const curve = new CatmullRomCurve3(config.points);
      const branchGeom = new TubeGeometry(curve, 16, 0.03, 5, false);
      const branchMat = new MeshBasicMaterial({
        color: 0x00c3ff, // 赛博亮青色
        transparent: true,
        opacity: 0.55,
        blending: AdditiveBlending,
      });
      const branchMesh = new Mesh(branchGeom, branchMat);
      this.treeGroup.add(branchMesh);
    });
  }

  // 树干点微粒能量云
  private buildTrunkParticles(): void {
    const count = this.isMobile ? 1200 : 2500;
    const { geom } = this.buildParticleGeometry(count, () => {
      const angle = Math.random() * Math.PI * 2;
      const r = 0.08 + Math.random() * 0.05;
      const y = -0.6 + Math.random() * 2.6;
      const taper = 1.0 - ((y + 0.6) / 2.6) * 0.45;
      return {
        x: Math.cos(angle) * r * taper,
        y,
        z: Math.sin(angle) * r * taper,
        size: 1.0 + Math.random() * 1.8,
        alpha: 0.6 + Math.random() * 0.4,
      };
    });
    const mat = this.makeParticleMaterial(new Color(0.0, 0.5, 1.0));
    this.treeGroup.add(new Points(geom, mat));
  }

  // 枝桠微粒能量流
  private buildBranchParticles(): void {
    const count = this.isMobile ? 2000 : 4000;
    const particlesPerBranch = Math.floor(count / BRANCH_CONFIGS.length);

    BRANCH_CONFIGS.forEach((config) => {
      const curve = new CatmullRomCurve3(config.points);
      const { geom } = this.buildParticleGeometry(particlesPerBranch, () => {
        const t = Math.random();
        const pt = curve.getPoint(t);
        const spread = 0.03 + t * 0.12;
        return {
          x: pt.x + (Math.random() - 0.5) * spread,
          y: pt.y + (Math.random() - 0.5) * spread,
          z: pt.z + (Math.random() - 0.5) * spread,
          size: 1.0 + Math.random() * 1.5,
          alpha: 0.45 + Math.random() * 0.55,
        };
      });
      const mat = this.makeParticleMaterial(new Color(0.0, 0.85, 1.0));
      this.treeGroup.add(new Points(geom, mat));
    });
  }

  // 核心硬性要求：打造 35,000+ 超高密度赛博粒子树冠
  private buildCrownParticles(): void {
    const count = this.isMobile ? 15000 : 35000;
    const particlesPerLobe = Math.floor(count / CROWN_LOBES.length);

    CROWN_LOBES.forEach((lobe, lobeIdx) => {
      const { geom, basePositions } = this.buildParticleGeometry(particlesPerLobe, () => {
        const phi = Math.acos(2 * Math.random() - 1);
        const theta = Math.random() * Math.PI * 2;
        const jitter = 0.8 + Math.random() * 0.35;
        return {
          x: lobe.cx + lobe.rx * Math.sin(phi) * Math.cos(theta) * jitter,
          y: lobe.cy + lobe.ry * Math.cos(phi) * jitter,
          z: lobe.cz + lobe.rz * Math.sin(phi) * Math.sin(theta) * jitter,
          size: 1.2 + Math.random() * 2.0, // 减小尺寸，对标视频中纤细分明的繁星微尘
          alpha: 0.35 + Math.random() * 0.65,
        };
      });

      // 极致魅幻的量子霓虹蓝与数字电极紫交织
      const color = lobeIdx % 2 === 0 ? new Color(0.0, 0.75, 1.0) : new Color(0.48, 0.18, 1.0);
      const mat = this.makeParticleMaterial(color);
      const points = new Points(geom, mat);
      this.treeGroup.add(points);

      // 保存每瓣的几何数据和 base 数组，用于在渲染时执行 3D 旋度风场流动
      this.crownSystems.push({ points, basePositions, lobe });
    });
  }

  // 打造树底周围漂浮起舞的小萤火虫点
  private buildFireflies(): void {
    const count = this.isMobile ? 100 : 200;
    const { geom, basePositions } = this.buildParticleGeometry(count, () => {
      const angle = Math.random() * Math.PI * 2;
      const r = 0.5 + Math.random() * 4.0;
      const y = -0.2 + Math.random() * 4.2;
      return {
        x: Math.cos(angle) * r,
        y,
        z: Math.sin(angle) * r,
        size: 1.5 + Math.random() * 3.5,
        alpha: 0.3 + Math.random() * 0.7,
      };
    });
    const mat = this.makeParticleMaterial(new Color(0.25, 1.0, 0.55)); // 莹绿
    this.fireflies = new Points(geom, mat);
    this.fireflyBasePositions = basePositions;
    this.treeGroup.add(this.fireflies);
  }

  // 制作向上升华流动的高能数字粒子火花
  private buildRisingEnergySparks(): void {
    const count = this.isMobile ? 80 : 180;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const alphas = new Float32Array(count);
    this.sparkSpeeds = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * 0.38;
      positions[i * 3] = Math.cos(angle) * r;
      positions[i * 3 + 1] = -0.6 + Math.random() * 3.2;
      positions[i * 3 + 2] = Math.sin(angle) * r;

      sizes[i] = 1.2 + Math.random() * 1.8;
      alphas[i] = 0.4 + Math.random() * 0.6;
      this.sparkSpeeds[i] = 0.22 + Math.random() * 0.32;
    }

    const geom = new BufferGeometry();
    geom.setAttribute('position', new Float32BufferAttribute(positions, 3));
    geom.setAttribute('aSize', new Float32BufferAttribute(sizes, 1));
    geom.setAttribute('aAlpha', new Float32BufferAttribute(alphas, 1));

    const mat = this.makeParticleMaterial(new Color(0.0, 0.95, 1.0)); // 亮青
    this.sparks = new Points(geom, mat);
    this.sparkPositions = positions;
    this.treeGroup.add(this.sparks);
  }

  // 构造大体积明亮的仿生蝴蝶
  private buildFlutteringButterflies(): void {
    const count = this.isMobile ? 4 : 8;
    const butterColor = new Color(0.0, 0.9, 1.0); // 发光青色

    for (let i = 0; i < count; i++) {
      // 放大蝴蝶发光体，对标 蓝月亮树.mp4 视频中的明亮展翅感
      const geom = new SphereGeometry(0.08, 12, 12);
      const mat = new MeshBasicMaterial({
        color: butterColor,
        transparent: true,
        opacity: 0.95,
        blending: AdditiveBlending,
      });
      const mesh = new Mesh(geom, mat);
      this.treeGroup.add(mesh);

      // 给每只蝴蝶初始化飞行轨道数据
      const theta = (i / count) * Math.PI * 2;
      this.butterflies.push({
        mesh,
        center: new Vector3(0, 1.8 + Math.random() * 1.5, 0),
        radius: 1.4 + Math.random() * 1.8,
        speed: 0.3 + Math.random() * 0.35,
        offsetY: Math.random() * 0.8,
        phase: Math.random() * 100,
      });
    }
  }

  // 太空多层发光大月亮
  private buildMultiLayeredMoon(): void {
    const moonGroup = new Group();
    moonGroup.position.set(this.isMobile ? 1.6 : 3.2, this.isMobile ? 3.4 : 3.8, -5);

    // 1. 月亮主体小球
    const moonGeom = new SphereGeometry(0.8, 32, 32);
    const moonMat = new MeshBasicMaterial({
      color: 0xd9ebff, // 莹润清澈的极地白蓝
    });
    const moon = new Mesh(moonGeom, moonMat);
    moonGroup.add(moon);

    // 2. 双重 Canvas 精致漫反射发光晕 (Emissive soft halo)
    const midTex = this.createGlowTexture('#3399ff');
    const midMat = new SpriteMaterial({
      map: midTex,
      transparent: true,
      opacity: 0.45,
      blending: AdditiveBlending,
    });
    const midGlow = new Sprite(midMat);
    midGlow.scale.set(4.0, 4.0, 1.0);
    moonGroup.add(midGlow);

    const outerTex = this.createGlowTexture('#0033ff');
    const outerMat = new SpriteMaterial({
      map: outerTex,
      transparent: true,
      opacity: 0.3,
      blending: AdditiveBlending,
    });
    const outerGlow = new Sprite(outerMat);
    outerGlow.scale.set(7.5, 7.5, 1.0);
    moonGroup.add(outerGlow);

    this.scene.add(moonGroup);
  }

  // 构造太空群星星宿
  private buildBackgroundStarField(): void {
    const count = this.isMobile ? 500 : 1000;
    const { geom } = this.buildParticleGeometry(count, () => ({
      x: (Math.random() - 0.5) * 60,
      y: (Math.random() - 0.5) * 60,
      z: (Math.random() - 0.5) * 60 - 15,
      size: 0.8 + Math.random() * 1.5,
      alpha: 0.2 + Math.random() * 0.5,
    }));
    const mat = this.makeParticleMaterial(new Color(0.9, 0.95, 1.0));
    this.scene.add(new Points(geom, mat));
  }

  private bindEvents(): void {
    this.resizeHandler = () => this.resizeRenderer();
    window.addEventListener('resize', this.resizeHandler);

    this.mouseMoveHandler = (e: MouseEvent) => {
      this.mouseX = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouseY = -(e.clientY / window.innerHeight) * 2 + 1;

      this.targetRotY = this.mouseX * 0.08;
      this.targetRotX = -this.mouseY * 0.05;
    };
    window.addEventListener('mousemove', this.mouseMoveHandler);
  }

  private resizeRenderer(): void {
    const parent = this.canvas.parentElement;
    if (!parent) return;
    const w = parent.clientWidth;
    const h = parent.clientHeight;
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  private animate(): void {
    if (this.disposed) return;
    this.animationId = requestAnimationFrame(() => this.animate());

    const elapsed = this.clock.getElapsedTime();
    const delta = this.clock.getDelta();
    const sf = this.speedFactor;

    // 1. 鼠标悬停视差微动平滑插值 (Parallax interpolation)
    this.treeGroup.rotation.y =
      this.treeGroup.rotation.y + (this.targetRotY - this.treeGroup.rotation.y) * 0.05 * sf;
    this.treeGroup.rotation.x =
      this.treeGroup.rotation.x + (this.targetRotX - this.treeGroup.rotation.x) * 0.05 * sf;

    // 同时施加微风拂过摇曳
    this.treeGroup.rotation.z = Math.sin(elapsed * 0.26 * sf) * 0.008 * sf;

    // 2. 3D 旋度风场流动
    this.crownSystems.forEach((sys) => {
      const posAttr = sys.points.geometry.getAttribute('position') as Float32BufferAttribute;
      const arr = posAttr.array as Float32Array;
      const count = arr.length / 3;

      for (let i = 0; i < count; i++) {
        const bx = sys.basePositions[i * 3];
        const by = sys.basePositions[i * 3 + 1];
        const bz = sys.basePositions[i * 3 + 2];

        // 围绕各自分叉中心作旋转流动
        const timeScale = elapsed * 0.38 * sf + i * 0.0001;
        const angle = timeScale + by * 0.4;
        const offsetRadius = Math.sin(timeScale * 1.6 + bx * 0.28) * 0.18;

        arr[i * 3] = bx + Math.sin(angle) * (0.16 + offsetRadius);
        arr[i * 3 + 1] = by + Math.sin(timeScale * 1.3 + bz * 0.35) * 0.12;
        arr[i * 3 + 2] = bz + Math.cos(angle) * (0.16 + offsetRadius);
      }
      posAttr.needsUpdate = true;
    });

    // 3. 萤火虫在树底跳舞漂移
    if (this.fireflies) {
      const posAttr = this.fireflies.geometry.getAttribute('position') as Float32BufferAttribute;
      const arr = posAttr.array as Float32Array;
      const count = arr.length / 3;
      for (let i = 0; i < count; i++) {
        const bx = this.fireflyBasePositions[i * 3];
        const by = this.fireflyBasePositions[i * 3 + 1];
        const bz = this.fireflyBasePositions[i * 3 + 2];
        const phase = i * 0.8;

        arr[i * 3] = bx + Math.sin(elapsed * 0.4 * sf + phase) * 0.4;
        arr[i * 3 + 1] = by + Math.sin(elapsed * 0.28 * sf + phase * 1.3) * 0.3;
        arr[i * 3 + 2] = bz + Math.cos(elapsed * 0.35 * sf + phase * 0.9) * 0.4;
      }
      posAttr.needsUpdate = true;
    }

    // 4. 驱动自下而上能量数字火花
    if (this.sparks) {
      const posAttr = this.sparks.geometry.getAttribute('position') as Float32BufferAttribute;
      const arr = posAttr.array as Float32Array;
      const count = arr.length / 3;
      for (let i = 0; i < count; i++) {
        const speed = this.sparkSpeeds[i];
        arr[i * 3 + 1] += speed * delta * 1.6 * sf; // 垂直升华

        // 浮动抖动
        arr[i * 3] += Math.sin(elapsed * 2.2 + i) * 0.003;

        // 超出高度后循环重置于根部
        if (arr[i * 3 + 1] > 3.6) {
          arr[i * 3 + 1] = -0.6;
          arr[i * 3] = (Math.random() - 0.5) * 0.5;
        }
      }
      posAttr.needsUpdate = true;
    }

    // 5. 驱动大蝴蝶围绕树林优雅旋转振翅飞行
    this.butterflies.forEach((bf) => {
      bf.phase += bf.speed * 0.016 * sf;

      const x = bf.center.x + Math.cos(bf.phase) * bf.radius;
      const z = bf.center.z + Math.sin(bf.phase) * bf.radius;
      const y = bf.center.y + Math.sin(bf.phase * 2.4) * bf.offsetY;

      bf.mesh.position.set(x, y, z);

      // 振翅发光大小抖动
      const scale = 0.85 + Math.sin(bf.phase * 15.0) * 0.25;
      bf.mesh.scale.setScalar(scale);
    });

    this.composer.render();
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
    this.composer.dispose();
    this.crownSystems = [];
    this.butterflies = [];
    this.fireflies = null;
    this.sparks = null;
  }
}
