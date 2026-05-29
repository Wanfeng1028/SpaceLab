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

// 9 fixed branch paths radiating from trunk
const BRANCH_CONFIGS: BranchConfig[] = [
  { points: [new Vector3(0.05, 2.0, 0), new Vector3(0.6, 2.6, 0.3), new Vector3(1.4, 3.2, 0.2)] },
  {
    points: [
      new Vector3(-0.05, 2.0, 0),
      new Vector3(-0.7, 2.7, -0.2),
      new Vector3(-1.5, 3.3, -0.3),
    ],
  },
  {
    points: [new Vector3(0.03, 1.8, 0.03), new Vector3(0.9, 2.2, 0.5), new Vector3(1.6, 2.6, 0.8)],
  },
  {
    points: [
      new Vector3(-0.03, 1.8, -0.03),
      new Vector3(-0.8, 2.3, -0.4),
      new Vector3(-1.4, 2.8, -0.9),
    ],
  },
  { points: [new Vector3(0, 2.2, 0.04), new Vector3(0.4, 2.9, 0.7), new Vector3(0.8, 3.5, 1.2)] },
  {
    points: [
      new Vector3(0, 2.2, -0.04),
      new Vector3(-0.5, 2.8, -0.6),
      new Vector3(-1.0, 3.4, -1.1),
    ],
  },
  {
    points: [new Vector3(0.04, 1.5, 0.02), new Vector3(0.7, 1.9, 0.6), new Vector3(1.2, 2.4, 1.0)],
  },
  {
    points: [
      new Vector3(-0.04, 1.5, -0.02),
      new Vector3(-0.6, 2.0, -0.5),
      new Vector3(-1.1, 2.5, -0.8),
    ],
  },
  { points: [new Vector3(0, 2.4, 0), new Vector3(0.1, 3.2, 0.1), new Vector3(0.0, 4.0, 0.0)] },
];

// 5 ellipsoid lobes for crown
const CROWN_LOBES = [
  { cx: 0, cy: 4.0, cz: 0, rx: 2.1, ry: 1.3, rz: 2.1 },
  { cx: 1.5, cy: 3.5, cz: 0.5, rx: 1.6, ry: 1.1, rz: 1.6 },
  { cx: -1.5, cy: 3.5, cz: -0.5, rx: 1.6, ry: 1.1, rz: 1.6 },
  { cx: 0.5, cy: 3.8, cz: 1.5, rx: 1.4, ry: 1.1, rz: 1.4 },
  { cx: -0.5, cy: 3.8, cz: -1.5, rx: 1.4, ry: 1.1, rz: 1.4 },
];

export class MoonTreeScene {
  private scene!: Scene;
  private camera!: PerspectiveCamera;
  private renderer!: WebGLRenderer;
  private composer!: EffectComposer;
  private treeGroup!: Group;
  private clock!: Clock;
  private animationId: number | null = null;
  private resizeHandler!: () => void;
  private disposed = false;
  private contextLostHandler: ((e: Event) => void) | null = null;

  private fireflies: Points | null = null;
  private fireflyBasePositions!: Float32Array;
  private crownPoints: Points | null = null;
  private crownBasePositions!: Float32Array;

  // Rising energy sparks
  private sparks: Points | null = null;
  private sparkPositions!: Float32Array;
  private sparkSpeeds!: Float32Array;

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
    this.camera = new PerspectiveCamera(42, 1, 0.1, 200);

    // Position camera dynamically based on screen size
    if (this.isMobile) {
      this.camera.position.set(0, 1.6, 9.8);
    } else {
      this.camera.position.set(0, 1.3, 8.2);
    }

    this.renderer = new WebGLRenderer({
      canvas: this.canvas,
      antialias: !this.isMobile,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.contextLostHandler = (e: Event) => e.preventDefault();
    this.renderer.domElement.addEventListener('webglcontextlost', this.contextLostHandler);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x020206, 1.0); // 深黑蓝色背景
    this.renderer.toneMapping = 1; // LinearToneMapping
    this.renderer.toneMappingExposure = 1.0;
    this.resizeRenderer();

    // 1. UnrealBloom 后处理 - 调教出极致的梦幻发光氛围
    this.composer = new EffectComposer(this.renderer);
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    const bloomPass = new UnrealBloomPass(
      new Vector2(this.canvas.clientWidth, this.canvas.clientHeight),
      1.8, // strength 发光强度
      0.55, // radius 发光半径
      0.35, // threshold 发光阈值
    );
    this.composer.addPass(bloomPass);

    const outputPass = new OutputPass();
    this.composer.addPass(outputPass);

    this.treeGroup = new Group();
    this.scene.add(this.treeGroup);

    // 2. 构造 3D 实体发光树干骨架 (TubeGeometry + Emissive Glow)
    this.createSolidGlowSkeleton();

    // 3. 构造 3D 树冠粒子、树干粒子、星空、月亮与萤火虫
    this.createTrunkParticles();
    this.createBranchParticles();
    this.createCrownParticles();
    this.createFireflies();
    this.createRisingSparks();
    this.createStarBackground();
    this.createMoon();
  }

  // 动态创建极高品质的 Canvas 渐变粒子贴图
  private createGlowTexture(colorHex: string): CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.25, colorHex);
    grad.addColorStop(0.6, 'rgba(0, 80, 255, 0.2)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);

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
          gl_PointSize = aSize * (300.0 / -mvPos.z);
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

  // 核心视觉飞跃：构建发光的实体曲线树干和树枝，给树注入坚实的数字灵魂
  private createSolidGlowSkeleton(): void {
    // 主树干曲线
    const trunkPoints = [
      new Vector3(0, -0.6, 0),
      new Vector3(0.04, 0.8, 0.05),
      new Vector3(-0.06, 1.6, -0.05),
      new Vector3(0, 2.2, 0),
    ];
    const trunkCurve = new CatmullRomCurve3(trunkPoints);
    const trunkGeom = new TubeGeometry(trunkCurve, 24, 0.09, 8, false);
    const trunkMat = new MeshBasicMaterial({
      color: 0x0077ff, // 深海蓝
      transparent: true,
      opacity: 0.65,
      blending: AdditiveBlending,
    });
    const trunkMesh = new Mesh(trunkGeom, trunkMat);
    this.treeGroup.add(trunkMesh);

    // 树枝曲线管道
    BRANCH_CONFIGS.forEach((config) => {
      const curve = new CatmullRomCurve3(config.points);
      const branchGeom = new TubeGeometry(curve, 18, 0.035, 6, false);
      const branchMat = new MeshBasicMaterial({
        color: 0x00ccff, // 亮青蓝
        transparent: true,
        opacity: 0.55,
        blending: AdditiveBlending,
      });
      const branchMesh = new Mesh(branchGeom, branchMat);
      this.treeGroup.add(branchMesh);
    });
  }

  // 树干粒子云 - 渲染金莹剔透的能量流动感
  private createTrunkParticles(): void {
    const count = this.isMobile ? 1800 : 3600;
    const { geom } = this.buildParticleGeometry(count, () => {
      const angle = Math.random() * Math.PI * 2;
      const r = 0.09 + Math.random() * 0.06;
      const y = -0.6 + Math.random() * 2.8;
      // 树干向上渐细
      const taper = 1.0 - ((y + 0.6) / 2.8) * 0.45;
      return {
        x: Math.cos(angle) * r * taper,
        y,
        z: Math.sin(angle) * r * taper,
        size: 1.8 + Math.random() * 2.2,
        alpha: 0.65 + Math.random() * 0.35,
      };
    });
    // 使用纯正的量子科技蓝
    const mat = this.makeParticleMaterial(new Color(0.0, 0.55, 1.0));
    this.treeGroup.add(new Points(geom, mat));
  }

  // 树枝粒子云 - 精细包裹树骨架
  private createBranchParticles(): void {
    const count = this.isMobile ? 2500 : 5000;
    const particlesPerBranch = Math.floor(count / BRANCH_CONFIGS.length);

    BRANCH_CONFIGS.forEach((config) => {
      const curve = new CatmullRomCurve3(config.points);
      const { geom } = this.buildParticleGeometry(particlesPerBranch, () => {
        const t = Math.random();
        const pt = curve.getPoint(t);
        const spread = 0.04 + t * 0.12;
        return {
          x: pt.x + (Math.random() - 0.5) * spread,
          y: pt.y + (Math.random() - 0.5) * spread,
          z: pt.z + (Math.random() - 0.5) * spread,
          size: 1.5 + Math.random() * 1.8,
          alpha: 0.5 + Math.random() * 0.5,
        };
      });
      // 亮丽的青绿色，形成色彩层次
      const mat = this.makeParticleMaterial(new Color(0.0, 0.9, 1.0));
      this.treeGroup.add(new Points(geom, mat));
    });
  }

  // 树冠粒子云 - 大幅增加粒子密度，形成丰满饱满的赛博树冠
  private createCrownParticles(): void {
    const count = this.isMobile ? 12000 : 25000; // 翻倍粒子数量，极致丰满
    const particlesPerLobe = Math.floor(count / CROWN_LOBES.length);

    CROWN_LOBES.forEach((lobe, lobeIdx) => {
      const { geom, basePositions } = this.buildParticleGeometry(particlesPerLobe, () => {
        const phi = Math.acos(2 * Math.random() - 1);
        const theta = Math.random() * Math.PI * 2;
        const jitter = 0.82 + Math.random() * 0.36; // 轻微溢出形状
        return {
          x: lobe.cx + lobe.rx * Math.sin(phi) * Math.cos(theta) * jitter,
          y: lobe.cy + lobe.ry * Math.cos(phi) * jitter,
          z: lobe.cz + lobe.rz * Math.sin(phi) * Math.sin(theta) * jitter,
          size: 1.6 + Math.random() * 2.8,
          alpha: 0.4 + Math.random() * 0.6,
        };
      });

      // 极致科技感的霓虹蓝与幽魅紫交织，光效美轮美奂
      const color = lobeIdx % 2 === 0 ? new Color(0.0, 0.8, 1.0) : new Color(0.5, 0.2, 1.0);
      const mat = this.makeParticleMaterial(color);
      const points = new Points(geom, mat);
      this.treeGroup.add(points);

      // 保存第一层用于呼吸动画
      if (lobeIdx === 0) {
        this.crownPoints = points;
        this.crownBasePositions = basePositions;
      }
    });
  }

  // 萤火虫 / 蝴蝶 Sprite - 渲染漂浮起舞的亮绿/亮蓝萤火虫
  private createFireflies(): void {
    const count = this.isMobile ? 150 : 350;
    const { geom, basePositions } = this.buildParticleGeometry(count, () => {
      const angle = Math.random() * Math.PI * 2;
      const r = 0.6 + Math.random() * 4.5;
      const y = -0.2 + Math.random() * 4.8;
      return {
        x: Math.cos(angle) * r,
        y,
        z: Math.sin(angle) * r,
        size: 3.0 + Math.random() * 5.0, // 萤火虫大颗闪烁
        alpha: 0.35 + Math.random() * 0.65,
      };
    });
    // 璀璨闪烁的淡黄绿色
    const mat = this.makeParticleMaterial(new Color(0.3, 1.0, 0.6));
    this.fireflies = new Points(geom, mat);
    this.fireflyBasePositions = basePositions;
    this.treeGroup.add(this.fireflies);
  }

  // 向上缓缓升起的生命能量火花 (Sparks)
  private createRisingSparks(): void {
    const count = this.isMobile ? 120 : 300;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const alphas = new Float32Array(count);
    this.sparkSpeeds = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * 0.45;
      positions[i * 3] = Math.cos(angle) * r;
      positions[i * 3 + 1] = -0.5 + Math.random() * 3.5;
      positions[i * 3 + 2] = Math.sin(angle) * r;

      sizes[i] = 1.8 + Math.random() * 2.5;
      alphas[i] = 0.4 + Math.random() * 0.6;
      this.sparkSpeeds[i] = 0.2 + Math.random() * 0.35; // 上升速度
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

  // 星空背景 - 多层次星星闪烁
  private createStarBackground(): void {
    const count = this.isMobile ? 600 : 1300;
    const { geom } = this.buildParticleGeometry(count, () => ({
      x: (Math.random() - 0.5) * 65,
      y: (Math.random() - 0.5) * 65,
      z: (Math.random() - 0.5) * 65 - 15,
      size: 1.2 + Math.random() * 2.0,
      alpha: 0.2 + Math.random() * 0.6,
    }));
    const mat = this.makeParticleMaterial(new Color(0.9, 0.95, 1.0));
    this.scene.add(new Points(geom, mat));
  }

  // 月牙与多层梦幻柔和光晕
  private createMoon(): void {
    const moonGroup = new Group();
    moonGroup.position.set(this.isMobile ? 1.8 : 3.5, this.isMobile ? 3.6 : 4.2, -6);

    // 1. 月亮球体主体
    const moonGeom = new SphereGeometry(0.85, 32, 32);
    const moonMat = new MeshBasicMaterial({
      color: 0xe0efff, // 浅莹白蓝
    });
    const moon = new Mesh(moonGeom, moonMat);
    moonGroup.add(moon);

    // 2. 月亮中层蓝色光晕 (CanvasRadialGradient)
    const midGlowTex = this.createGlowTexture('#3399ff');
    const midGlowMat = new SpriteMaterial({
      map: midGlowTex,
      transparent: true,
      opacity: 0.45,
      blending: AdditiveBlending,
    });
    const midGlowSprite = new Sprite(midGlowMat);
    midGlowSprite.scale.set(4.0, 4.0, 1.0);
    moonGroup.add(midGlowSprite);

    // 3. 月亮外层超大漫反射光晕
    const outerGlowTex = this.createGlowTexture('#0044ff');
    const outerGlowMat = new SpriteMaterial({
      map: outerGlowTex,
      transparent: true,
      opacity: 0.3,
      blending: AdditiveBlending,
    });
    const outerGlowSprite = new Sprite(outerGlowMat);
    outerGlowSprite.scale.set(7.5, 7.5, 1.0);
    moonGroup.add(outerGlowSprite);

    this.scene.add(moonGroup);
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
    this.composer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  private animate(): void {
    if (this.disposed) return;
    this.animationId = requestAnimationFrame(() => this.animate());

    const elapsed = this.clock.getElapsedTime();
    const sf = this.speedFactor;

    // 树冠与主干微风轻抚摇曳
    this.treeGroup.rotation.z = Math.sin(elapsed * 0.25 * sf) * 0.012 * sf;
    this.treeGroup.rotation.y = Math.sin(elapsed * 0.15 * sf) * 0.01 * sf;

    // 萤火虫在树冠周围起舞漂浮
    if (this.fireflies) {
      const posAttr = this.fireflies.geometry.getAttribute('position') as Float32BufferAttribute;
      const arr = posAttr.array as Float32Array;
      const count = arr.length / 3;
      for (let i = 0; i < count; i++) {
        const bx = this.fireflyBasePositions[i * 3];
        const by = this.fireflyBasePositions[i * 3 + 1];
        const bz = this.fireflyBasePositions[i * 3 + 2];
        const phase = i * 0.8;

        arr[i * 3] = bx + Math.sin(elapsed * 0.45 * sf + phase) * 0.45;
        arr[i * 3 + 1] = by + Math.sin(elapsed * 0.3 * sf + phase * 1.4) * 0.35;
        arr[i * 3 + 2] = bz + Math.cos(elapsed * 0.4 * sf + phase * 0.8) * 0.45;
      }
      posAttr.needsUpdate = true;
    }

    // 向上升起的数字能量花火
    if (this.sparks) {
      const posAttr = this.sparks.geometry.getAttribute('position') as Float32BufferAttribute;
      const arr = posAttr.array as Float32Array;
      const count = arr.length / 3;
      for (let i = 0; i < count; i++) {
        const speed = this.sparkSpeeds[i];
        arr[i * 3 + 1] += speed * this.clock.getDelta() * 1.5 * sf; // 往上飘

        // 浮动抖动
        arr[i * 3] += Math.sin(elapsed * 2.0 + i) * 0.003;

        // 重新循环
        if (arr[i * 3 + 1] > 3.8) {
          arr[i * 3 + 1] = -0.5;
          arr[i * 3] = (Math.random() - 0.5) * 0.6;
        }
      }
      posAttr.needsUpdate = true;
    }

    // 树冠粒子柔和呼吸动画
    if (this.crownPoints) {
      const scale = 1.0 + Math.sin(elapsed * 0.32 * sf) * 0.02 * sf;
      this.crownPoints.scale.set(scale, scale, scale);
    }

    // 使用 UnrealBloom 渲染器渲染
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
    this.fireflies = null;
    this.crownPoints = null;
    this.sparks = null;
  }
}
