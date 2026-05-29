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
  PlaneGeometry,
} from 'three';

import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

interface BranchConfig {
  points: Vector3[];
}

const BRANCH_CONFIGS: BranchConfig[] = [
  { points: [new Vector3(0.05, 1.8, 0), new Vector3(0.5, 2.3, 0.2), new Vector3(1.4, 3.1, 0.2)] },
  {
    points: [
      new Vector3(-0.05, 1.8, 0),
      new Vector3(-0.6, 2.4, -0.2),
      new Vector3(-1.5, 3.2, -0.3),
    ],
  },
  {
    points: [new Vector3(0.03, 1.6, 0.03), new Vector3(0.8, 2.0, 0.4), new Vector3(1.6, 2.6, 0.7)],
  },
  {
    points: [
      new Vector3(-0.03, 1.6, -0.03),
      new Vector3(-0.7, 2.1, -0.3),
      new Vector3(-1.4, 2.8, -0.8),
    ],
  },
  { points: [new Vector3(0, 2.0, 0.04), new Vector3(0.35, 2.6, 0.6), new Vector3(0.8, 3.4, 1.1)] },
  {
    points: [
      new Vector3(0, 2.0, -0.04),
      new Vector3(-0.4, 2.5, -0.5),
      new Vector3(-1.0, 3.3, -1.1),
    ],
  },
  {
    points: [new Vector3(0.04, 1.3, 0.02), new Vector3(0.6, 1.7, 0.5), new Vector3(1.2, 2.4, 1.0)],
  },
  {
    points: [
      new Vector3(-0.04, 1.3, -0.02),
      new Vector3(-0.5, 1.8, -0.4),
      new Vector3(-1.1, 2.5, -0.8),
    ],
  },
  { points: [new Vector3(0, 2.2, 0), new Vector3(0.08, 2.9, 0.08), new Vector3(0.0, 3.9, 0.0)] },
];

const CROWN_LOBES = [
  { cx: 0, cy: 3.6, cz: 0, rx: 2.4, ry: 1.5, rz: 2.4 },
  { cx: 1.5, cy: 3.1, cz: 0.6, rx: 1.8, ry: 1.3, rz: 1.8 },
  { cx: -1.5, cy: 3.1, cz: -0.6, rx: 1.8, ry: 1.3, rz: 1.8 },
  { cx: 0.6, cy: 3.4, cz: 1.5, rx: 1.6, ry: 1.3, rz: 1.6 },
  { cx: -0.6, cy: 3.4, cz: -1.5, rx: 1.6, ry: 1.3, rz: 1.6 },
];

interface Butterfly {
  sprite: Sprite;
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
  private reflectionGroup!: Group;
  private clock!: Clock;

  private animationId: number | null = null;
  private resizeHandler!: () => void;
  private mouseMoveHandler!: (e: MouseEvent) => void;
  private disposed = false;
  private contextLostHandler: ((e: Event) => void) | null = null;

  private crownSystems: { points: Points; basePositions: Float32Array; lobe: any }[] = [];

  private fireflies: Points | null = null;
  private fireflyBasePositions!: Float32Array;
  private sparks: Points | null = null;
  private sparkPositions!: Float32Array;
  private sparkSpeeds!: Float32Array;

  private fallingParticles: Points | null = null;
  private fallingPositions!: Float32Array;

  private butterflies: Butterfly[] = [];
  private volumeFogSprites: Sprite[] = [];

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

    this.camera = new PerspectiveCamera(45, 1, 0.1, 200);
    this.camera.position.set(0, 2.0, this.isMobile ? 16 : 13);
    this.camera.lookAt(0, 2.0, 0);

    this.renderer = new WebGLRenderer({
      canvas: this.canvas,
      antialias: !this.isMobile,
      alpha: false,
      powerPreference: 'high-performance',
    });

    this.contextLostHandler = (e: Event) => e.preventDefault();
    this.renderer.domElement.addEventListener('webglcontextlost', this.contextLostHandler);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
    this.renderer.setClearColor(0x020208, 1.0);

    this.composer = new EffectComposer(this.renderer);
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    const bloomPass = new UnrealBloomPass(
      new Vector2(this.canvas.clientWidth, this.canvas.clientHeight),
      1.0, // strength
      0.5, // radius
      0.65, // threshold
    );
    this.composer.addPass(bloomPass);

    const outputPass = new OutputPass();
    this.composer.addPass(outputPass);

    this.treeGroup = new Group();
    this.scene.add(this.treeGroup);

    this.buildBionicSkeleton();
    this.buildTrunkParticles();
    this.buildBranchParticles();
    this.buildCrownParticles();

    this.buildWaterReflection();

    this.buildFireflies();
    this.buildRisingEnergySparks();
    this.buildFallingParticles();
    this.buildFlutteringButterflies();
    this.buildMultiLayeredMoon();
    this.buildBackgroundStarField();
    this.buildVolumeFog();
  }

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
          gl_PointSize = aSize * (50.0 / -mvPos.z);
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

  private buildBionicSkeleton(): void {
    const trunkPoints = [
      new Vector3(0, -1.5, 0),
      new Vector3(0.05, -0.2, 0.05),
      new Vector3(-0.06, 1.2, -0.05),
      new Vector3(0, 3.0, 0),
    ];
    const trunkCurve = new CatmullRomCurve3(trunkPoints);
    const trunkGeom = new TubeGeometry(trunkCurve, 20, 0.08, 8, false);
    const trunkMat = new MeshBasicMaterial({
      color: 0x004fff,
      transparent: true,
      opacity: 0.65,
      blending: AdditiveBlending,
    });
    this.treeGroup.add(new Mesh(trunkGeom, trunkMat));

    BRANCH_CONFIGS.forEach((config) => {
      const curve = new CatmullRomCurve3(config.points);
      const branchGeom = new TubeGeometry(curve, 16, 0.03, 5, false);
      const branchMat = new MeshBasicMaterial({
        color: 0x00c3ff,
        transparent: true,
        opacity: 0.55,
        blending: AdditiveBlending,
      });
      this.treeGroup.add(new Mesh(branchGeom, branchMat));
    });
  }

  private buildTrunkParticles(): void {
    const count = this.isMobile ? 1200 : 2500;
    const { geom } = this.buildParticleGeometry(count, () => {
      const angle = Math.random() * Math.PI * 2;
      const r = 0.08 + Math.random() * 0.05;
      const y = -1.5 + Math.random() * 4.5;
      const taper = 1.0 - ((y + 1.5) / 4.5) * 0.45;
      return {
        x: Math.cos(angle) * r * taper,
        y,
        z: Math.sin(angle) * r * taper,
        size: 1.0 + Math.random() * 1.8,
        alpha: 0.6 + Math.random() * 0.4,
      };
    });
    this.treeGroup.add(new Points(geom, this.makeParticleMaterial(new Color(0.0, 0.5, 1.0))));
  }

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
      this.treeGroup.add(new Points(geom, this.makeParticleMaterial(new Color(0.0, 0.85, 1.0))));
    });
  }

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
          size: 1.2 + Math.random() * 2.0,
          alpha: 0.35 + Math.random() * 0.65,
        };
      });

      const color = lobeIdx % 2 === 0 ? new Color(0.0, 0.75, 1.0) : new Color(0.48, 0.18, 1.0);
      const points = new Points(geom, this.makeParticleMaterial(color));
      this.treeGroup.add(points);
      this.crownSystems.push({ points, basePositions, lobe });
    });
  }

  private buildWaterReflection(): void {
    const groundGeom = new PlaneGeometry(30, 30);
    groundGeom.rotateX(-Math.PI / 2);
    const groundMat = new MeshBasicMaterial({
      color: 0x020810,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
    });
    const ground = new Mesh(groundGeom, groundMat);
    ground.position.y = -1.5;
    this.scene.add(ground);

    this.reflectionGroup = this.treeGroup.clone();

    this.reflectionGroup.traverse((obj: any) => {
      if (obj.material) {
        obj.material = obj.material.clone();
        if (obj.material.opacity) {
          obj.material.opacity *= 0.2;
        }
      }
    });

    this.reflectionGroup.scale.y = -1;
    this.reflectionGroup.position.y = -3.0;
    this.scene.add(this.reflectionGroup);

    const { geom } = this.buildParticleGeometry(500, () => {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * 8.0;
      return {
        x: Math.cos(angle) * r,
        y: -1.5,
        z: Math.sin(angle) * r,
        size: 0.5 + Math.random() * 1.0,
        alpha: 0.1 + Math.random() * 0.2,
      };
    });
    this.scene.add(new Points(geom, this.makeParticleMaterial(new Color(0.0, 0.6, 1.0))));
  }

  private buildFireflies(): void {
    const count = this.isMobile ? 100 : 200;
    const { geom, basePositions } = this.buildParticleGeometry(count, () => {
      const angle = Math.random() * Math.PI * 2;
      const r = 0.5 + Math.random() * 4.0;
      const y = -1.2 + Math.random() * 5.0;
      return {
        x: Math.cos(angle) * r,
        y,
        z: Math.sin(angle) * r,
        size: 1.5 + Math.random() * 3.5,
        alpha: 0.3 + Math.random() * 0.7,
      };
    });
    this.fireflies = new Points(geom, this.makeParticleMaterial(new Color(0.25, 1.0, 0.55)));
    this.fireflyBasePositions = basePositions;
    this.treeGroup.add(this.fireflies);
  }

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
      positions[i * 3 + 1] = -1.5 + Math.random() * 4.5;
      positions[i * 3 + 2] = Math.sin(angle) * r;

      sizes[i] = 1.2 + Math.random() * 1.8;
      alphas[i] = 0.4 + Math.random() * 0.6;
      this.sparkSpeeds[i] = 0.22 + Math.random() * 0.32;
    }

    const geom = new BufferGeometry();
    geom.setAttribute('position', new Float32BufferAttribute(positions, 3));
    geom.setAttribute('aSize', new Float32BufferAttribute(sizes, 1));
    geom.setAttribute('aAlpha', new Float32BufferAttribute(alphas, 1));

    this.sparks = new Points(geom, this.makeParticleMaterial(new Color(0.0, 0.95, 1.0)));
    this.sparkPositions = positions;
    this.treeGroup.add(this.sparks);
  }

  private buildFallingParticles(): void {
    const count = this.isMobile ? 150 : 300;
    const { geom, basePositions } = this.buildParticleGeometry(count, () => {
      const x = (Math.random() - 0.5) * 8.0;
      const z = (Math.random() - 0.5) * 8.0;
      const y = -1.5 + Math.random() * 8.0;
      return { x, y, z, size: 0.8 + Math.random() * 1.5, alpha: 0.2 + Math.random() * 0.4 };
    });
    this.fallingParticles = new Points(geom, this.makeParticleMaterial(new Color(0.5, 0.8, 1.0)));
    this.fallingPositions = basePositions;
    this.treeGroup.add(this.fallingParticles);
  }

  private buildFlutteringButterflies(): void {
    const count = this.isMobile ? 4 : 8;

    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    const cx = 64;
    const cy = 64;

    ctx.shadowColor = '#00e6ff';
    ctx.shadowBlur = 10;

    const grad = ctx.createLinearGradient(0, 0, 128, 128);
    grad.addColorStop(0, '#00e6ff');
    grad.addColorStop(1, 'rgba(0, 230, 255, 0.1)');

    ctx.fillStyle = grad;

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.bezierCurveTo(cx - 20, cy - 40, cx - 50, cy - 50, cx - 60, cy - 20);
    ctx.bezierCurveTo(cx - 50, cy + 20, cx - 20, cy + 40, cx, cy + 50);
    ctx.moveTo(cx, cy);
    ctx.bezierCurveTo(cx + 20, cy - 40, cx + 50, cy - 50, cx + 60, cy - 20);
    ctx.bezierCurveTo(cx + 50, cy + 20, cx + 20, cy + 40, cx, cy + 50);
    ctx.fill();

    const texture = new CanvasTexture(canvas);

    for (let i = 0; i < count; i++) {
      const mat = new SpriteMaterial({
        map: texture,
        color: 0x00e6ff,
        transparent: true,
        blending: AdditiveBlending,
        depthWrite: false,
      });
      const sprite = new Sprite(mat);
      sprite.scale.set(0.3, 0.3, 1.0);
      this.treeGroup.add(sprite);

      this.butterflies.push({
        sprite,
        center: new Vector3(0, 1.0 + Math.random() * 2.5, 0),
        radius: 2.0 + Math.random() * 2.5,
        speed: 0.3 + Math.random() * 0.35,
        offsetY: Math.random() * 1.2,
        phase: Math.random() * 100,
      });
    }
  }

  private buildMultiLayeredMoon(): void {
    const moonGroup = new Group();
    moonGroup.position.set(this.isMobile ? 2.0 : 3.5, this.isMobile ? 4.5 : 5.0, -6);

    const moonGeom = new SphereGeometry(0.9, 32, 32);
    const moonMat = new MeshBasicMaterial({ color: 0xd9ebff });
    moonGroup.add(new Mesh(moonGeom, moonMat));

    const midTex = this.createGlowTexture('#3399ff');
    const midMat = new SpriteMaterial({
      map: midTex,
      transparent: true,
      opacity: 0.5,
      blending: AdditiveBlending,
      depthWrite: false,
    });
    const midGlow = new Sprite(midMat);
    midGlow.scale.set(5.0, 5.0, 1.0);
    moonGroup.add(midGlow);

    const outerTex = this.createGlowTexture('#0033ff');
    const outerMat = new SpriteMaterial({
      map: outerTex,
      transparent: true,
      opacity: 0.3,
      blending: AdditiveBlending,
      depthWrite: false,
    });
    const outerGlow = new Sprite(outerMat);
    outerGlow.scale.set(9.0, 9.0, 1.0);
    moonGroup.add(outerGlow);

    const ultraTex = this.createGlowTexture('#001177');
    const ultraMat = new SpriteMaterial({
      map: ultraTex,
      transparent: true,
      opacity: 0.15,
      blending: AdditiveBlending,
      depthWrite: false,
    });
    const ultraGlow = new Sprite(ultraMat);
    ultraGlow.scale.set(14.0, 14.0, 1.0);
    moonGroup.add(ultraGlow);

    this.scene.add(moonGroup);
  }

  private buildBackgroundStarField(): void {
    const count = this.isMobile ? 600 : 1200;
    const { geom } = this.buildParticleGeometry(count, () => ({
      x: (Math.random() - 0.5) * 80,
      y: (Math.random() - 0.5) * 80,
      z: (Math.random() - 0.5) * 80 - 15,
      size: 0.8 + Math.random() * 1.5,
      alpha: 0.2 + Math.random() * 0.5,
    }));
    this.scene.add(new Points(geom, this.makeParticleMaterial(new Color(0.9, 0.95, 1.0))));
  }

  private buildVolumeFog(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    grad.addColorStop(0, '#0a1a3a');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);

    const texture = new CanvasTexture(canvas);
    texture.minFilter = LinearFilter;

    for (let i = 0; i < 5; i++) {
      const mat = new SpriteMaterial({
        map: texture,
        transparent: true,
        opacity: 0.08 + Math.random() * 0.04,
        blending: AdditiveBlending,
        depthWrite: false,
      });
      const sprite = new Sprite(mat);
      sprite.position.set(
        (Math.random() - 0.5) * 4,
        1.0 + Math.random() * 3,
        (Math.random() - 0.5) * 3 - 1,
      );
      sprite.scale.set(8, 8, 1);
      this.volumeFogSprites.push(sprite);
      this.treeGroup.add(sprite);
    }
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
    const sf = this.speedFactor;

    this.treeGroup.rotation.y =
      this.treeGroup.rotation.y + (this.targetRotY - this.treeGroup.rotation.y) * 0.05 * sf;
    this.treeGroup.rotation.x =
      this.treeGroup.rotation.x + (this.targetRotX - this.treeGroup.rotation.x) * 0.05 * sf;

    this.treeGroup.rotation.z = Math.sin(elapsed * 0.26 * sf) * 0.008 * sf;

    if (this.reflectionGroup) {
      this.reflectionGroup.rotation.copy(this.treeGroup.rotation);
      this.reflectionGroup.position.y = -3.0 + Math.sin(elapsed * 1.5) * 0.02;
    }

    this.crownSystems.forEach((sys) => {
      const posAttr = sys.points.geometry.getAttribute('position') as Float32BufferAttribute;
      const arr = posAttr.array as Float32Array;
      const count = arr.length / 3;

      for (let i = 0; i < count; i++) {
        const bx = sys.basePositions[i * 3];
        const by = sys.basePositions[i * 3 + 1];
        const bz = sys.basePositions[i * 3 + 2];

        const timeScale = elapsed * 0.38 * sf + i * 0.0001;
        const angle = timeScale + by * 0.4;
        const offsetRadius = Math.sin(timeScale * 1.6 + bx * 0.28) * 0.18;

        arr[i * 3] = bx + Math.sin(angle) * (0.16 + offsetRadius);
        arr[i * 3 + 1] = by + Math.sin(timeScale * 1.3 + bz * 0.35) * 0.12;
        arr[i * 3 + 2] = bz + Math.cos(angle) * (0.16 + offsetRadius);
      }
      posAttr.needsUpdate = true;
    });

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

    if (this.sparks) {
      const posAttr = this.sparks.geometry.getAttribute('position') as Float32BufferAttribute;
      const arr = posAttr.array as Float32Array;
      const count = arr.length / 3;
      for (let i = 0; i < count; i++) {
        const speed = this.sparkSpeeds[i];
        arr[i * 3 + 1] += speed * 0.016 * 1.6 * sf;
        arr[i * 3] += Math.sin(elapsed * 2.2 + i) * 0.003;

        if (arr[i * 3 + 1] > 4.5) {
          arr[i * 3 + 1] = -1.5;
          arr[i * 3] = (Math.random() - 0.5) * 0.5;
        }
      }
      posAttr.needsUpdate = true;
    }

    if (this.fallingParticles) {
      const posAttr = this.fallingParticles.geometry.getAttribute(
        'position',
      ) as Float32BufferAttribute;
      const arr = posAttr.array as Float32Array;
      const count = arr.length / 3;
      for (let i = 0; i < count; i++) {
        arr[i * 3 + 1] -= 0.5 * 0.016 * sf;
        arr[i * 3] += Math.sin(elapsed * 0.5 + i) * 0.005;

        if (arr[i * 3 + 1] < -1.5) {
          arr[i * 3 + 1] = 5.0 + Math.random() * 3.0;
        }
      }
      posAttr.needsUpdate = true;
    }

    this.butterflies.forEach((bf) => {
      bf.phase += bf.speed * 0.016 * sf;
      const x = bf.center.x + Math.cos(bf.phase) * bf.radius;
      const z = bf.center.z + Math.sin(bf.phase) * bf.radius;
      const y = bf.center.y + Math.sin(bf.phase * 2.4) * bf.offsetY;
      bf.sprite.position.set(x, y, z);

      const flap = 0.65 + Math.sin(bf.phase * 25.0) * 0.35;
      bf.sprite.scale.x = 0.3 * flap;
    });

    this.volumeFogSprites.forEach((sprite, i) => {
      sprite.rotation.z += 0.001 * (i % 2 === 0 ? 1 : -1) * sf;
      sprite.material.opacity = 0.08 + Math.sin(elapsed * 0.5 + i) * 0.04;
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
    this.volumeFogSprites = [];
    this.fireflies = null;
    this.sparks = null;
    this.fallingParticles = null;
  }
}
