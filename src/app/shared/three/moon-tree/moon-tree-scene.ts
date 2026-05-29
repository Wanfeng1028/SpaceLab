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
  DoubleSide,
} from 'three';

import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

/* ------------------------------------------------------------------ */
/*  Static configuration                                               */
/* ------------------------------------------------------------------ */

interface BranchConfig {
  points: Vector3[];
}

// 9 organic bionic branch curves radiating from trunk (slightly extended)
const BRANCH_CONFIGS: BranchConfig[] = [
  { points: [new Vector3(0.05, 1.8, 0), new Vector3(0.5, 2.3, 0.2), new Vector3(1.5, 3.0, 0.25)] },
  {
    points: [
      new Vector3(-0.05, 1.8, 0),
      new Vector3(-0.6, 2.4, -0.2),
      new Vector3(-1.6, 3.1, -0.35),
    ],
  },
  {
    points: [new Vector3(0.03, 1.6, 0.03), new Vector3(0.8, 2.0, 0.4), new Vector3(1.7, 2.5, 0.8)],
  },
  {
    points: [
      new Vector3(-0.03, 1.6, -0.03),
      new Vector3(-0.7, 2.1, -0.3),
      new Vector3(-1.5, 2.7, -0.9),
    ],
  },
  { points: [new Vector3(0, 2.0, 0.04), new Vector3(0.35, 2.6, 0.6), new Vector3(0.8, 3.3, 1.1)] },
  {
    points: [
      new Vector3(0, 2.0, -0.04),
      new Vector3(-0.4, 2.5, -0.5),
      new Vector3(-1.0, 3.2, -1.1),
    ],
  },
  {
    points: [new Vector3(0.04, 1.3, 0.02), new Vector3(0.6, 1.7, 0.5), new Vector3(1.2, 2.3, 1.0)],
  },
  {
    points: [
      new Vector3(-0.04, 1.3, -0.02),
      new Vector3(-0.5, 1.8, -0.4),
      new Vector3(-1.1, 2.4, -0.8),
    ],
  },
  { points: [new Vector3(0, 2.2, 0), new Vector3(0.08, 2.9, 0.08), new Vector3(0.0, 3.8, 0.0)] },
];

// 5 crown lobe coordinates mapping leaf clusters
const CROWN_LOBES = [
  { cx: 0, cy: 3.6, cz: 0, rx: 2.2, ry: 1.4, rz: 2.2 },
  { cx: 1.4, cy: 3.1, cz: 0.5, rx: 1.7, ry: 1.2, rz: 1.7 },
  { cx: -1.4, cy: 3.1, cz: -0.5, rx: 1.7, ry: 1.2, rz: 1.7 },
  { cx: 0.5, cy: 3.4, cz: 1.4, rx: 1.5, ry: 1.2, rz: 1.5 },
  { cx: -0.5, cy: 3.4, cz: -1.4, rx: 1.5, ry: 1.2, rz: 1.5 },
];

const GROUND_Y = -1.5;

/* ------------------------------------------------------------------ */
/*  Butterfly data                                                     */
/* ------------------------------------------------------------------ */
interface ButterflyData {
  sprite: Sprite;
  center: Vector3;
  radius: number;
  speed: number;
  offsetY: number;
  phase: number;
  baseScaleX: number;
}

/* ------------------------------------------------------------------ */
/*  Main scene class                                                   */
/* ------------------------------------------------------------------ */

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

  // Crown particle systems for wind-field animation
  private crownSystems: { points: Points; basePositions: Float32Array }[] = [];

  // Fireflies
  private fireflies: Points | null = null;
  private fireflyBasePositions!: Float32Array;

  // Rising energy sparks
  private sparks: Points | null = null;
  private sparkPositions!: Float32Array;
  private sparkSpeeds!: Float32Array;

  // Falling / drifting particles
  private fallingParticles: Points | null = null;
  private fallingPositions!: Float32Array;
  private fallingSpeeds!: Float32Array;
  private fallingSwayPhases!: Float32Array;

  // Butterfly wing sprites
  private butterflies: ButterflyData[] = [];

  // Volume fog sprites
  private fogSprites: { sprite: Sprite; baseOpacity: number; rotSpeed: number }[] = [];

  // Water surface particles
  private waterParticles: Points | null = null;
  private waterBasePositions!: Float32Array;

  // Ripple rings on water
  private rippleRings: Mesh[] = [];

  // Moon halo pulse references
  private moonGroup: Group | null = null;
  private moonMidGlow: Sprite | null = null;
  private moonOuterGlow: Sprite | null = null;
  private moonUltraGlow: Sprite | null = null;

  // Mouse parallax
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

  /* ================================================================ */
  /*  Public lifecycle                                                  */
  /* ================================================================ */

  init(): void {
    this.initScene();
    this.bindEvents();
    this.animate();
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

    this.scene.traverse((obj: any) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m: any) => {
            if (m.map) m.map.dispose();
            m.dispose();
          });
        } else {
          if (obj.material.map) obj.material.map.dispose();
          obj.material.dispose();
        }
      }
    });

    this.renderer.dispose();
    this.composer.dispose();
    this.crownSystems = [];
    this.butterflies = [];
    this.fogSprites = [];
    this.rippleRings = [];
    this.fireflies = null;
    this.sparks = null;
    this.fallingParticles = null;
    this.waterParticles = null;
    this.moonGroup = null;
    this.moonMidGlow = null;
    this.moonOuterGlow = null;
    this.moonUltraGlow = null;
  }

  /* ================================================================ */
  /*  Scene initialisation                                             */
  /* ================================================================ */

  private initScene(): void {
    this.scene = new Scene();

    this.camera = new PerspectiveCamera(45, 1, 0.1, 200);
    if (this.isMobile) {
      this.camera.position.set(0, 2.0, 16);
    } else {
      this.camera.position.set(0, 2.0, 13);
    }
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

    // Post-processing bloom
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    const bloomPass = new UnrealBloomPass(
      new Vector2(this.canvas.clientWidth, this.canvas.clientHeight),
      1.0,
      0.5,
      0.65,
    );
    this.composer.addPass(bloomPass);
    this.composer.addPass(new OutputPass());

    // Tree group – all above-water objects
    this.treeGroup = new Group();
    this.scene.add(this.treeGroup);

    // Build the tree elements
    this.buildBionicSkeleton();
    this.buildTrunkParticles();
    this.buildBranchParticles();
    this.buildCrownParticles();
    this.buildFireflies();
    this.buildRisingEnergySparks();
    this.buildButterflyWingSprites();
    this.buildFallingParticles();
    this.buildVolumeFogSprites();

    // Build reflection AFTER the tree is fully populated
    this.buildWaterSurface();
    this.buildReflection();
    this.buildWaterSurfaceParticles();
    this.buildRippleRings();

    // Scene-level elements (not reflected)
    this.buildMultiLayeredMoon();
    this.buildBackgroundStarField();
  }

  /* ================================================================ */
  /*  Helper: glow texture                                             */
  /* ================================================================ */

  private createGlowTexture(colorHex: string, size = 64): CanvasTexture {
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const ctx = c.getContext('2d')!;
    const half = size / 2;
    const grad = ctx.createRadialGradient(half, half, 0, half, half, half);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.2, colorHex);
    grad.addColorStop(0.5, 'rgba(0,100,255,0.12)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    const tex = new CanvasTexture(c);
    tex.minFilter = LinearFilter;
    return tex;
  }

  /* ================================================================ */
  /*  Helper: particle shader material                                 */
  /* ================================================================ */

  private makeParticleMaterial(color: Color, blending = AdditiveBlending): ShaderMaterial {
    return new ShaderMaterial({
      uniforms: { uColor: { value: color } },
      vertexShader: /* glsl */ `
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
      fragmentShader: /* glsl */ `
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

  /* ================================================================ */
  /*  Helper: build particle geometry                                  */
  /* ================================================================ */

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

  /* ================================================================ */
  /*  §2 Bionic tube skeleton                                          */
  /* ================================================================ */

  private buildBionicSkeleton(): void {
    // Main trunk
    const trunkCurve = new CatmullRomCurve3([
      new Vector3(0, -1.5, 0),
      new Vector3(0.05, 0.3, 0.05),
      new Vector3(-0.06, 1.5, -0.05),
      new Vector3(0, 3.0, 0),
    ]);
    const trunkGeom = new TubeGeometry(trunkCurve, 20, 0.08, 8, false);
    const trunkMat = new MeshBasicMaterial({
      color: 0x004fff,
      transparent: true,
      opacity: 0.65,
      blending: AdditiveBlending,
    });
    this.treeGroup.add(new Mesh(trunkGeom, trunkMat));

    // 9 branches
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

  /* ================================================================ */
  /*  §3a Trunk particles                                              */
  /* ================================================================ */

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

  /* ================================================================ */
  /*  §3b Branch particles                                             */
  /* ================================================================ */

  private buildBranchParticles(): void {
    const count = this.isMobile ? 2000 : 4000;
    const perBranch = Math.floor(count / BRANCH_CONFIGS.length);

    BRANCH_CONFIGS.forEach((config) => {
      const curve = new CatmullRomCurve3(config.points);
      const { geom } = this.buildParticleGeometry(perBranch, () => {
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

  /* ================================================================ */
  /*  §3c Crown particles – 35 000 / 15 000                           */
  /* ================================================================ */

  private buildCrownParticles(): void {
    const count = this.isMobile ? 15000 : 35000;
    const perLobe = Math.floor(count / CROWN_LOBES.length);

    CROWN_LOBES.forEach((lobe, idx) => {
      const { geom, basePositions } = this.buildParticleGeometry(perLobe, () => {
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

      const color = idx % 2 === 0 ? new Color(0.0, 0.75, 1.0) : new Color(0.48, 0.18, 1.0);
      const pts = new Points(geom, this.makeParticleMaterial(color));
      this.treeGroup.add(pts);
      this.crownSystems.push({ points: pts, basePositions });
    });
  }

  /* ================================================================ */
  /*  §9 Fireflies                                                     */
  /* ================================================================ */

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
    const mat = this.makeParticleMaterial(new Color(0.25, 1.0, 0.55));
    this.fireflies = new Points(geom, mat);
    this.fireflyBasePositions = basePositions;
    this.treeGroup.add(this.fireflies);
  }

  /* ================================================================ */
  /*  §10 Rising energy sparks                                         */
  /* ================================================================ */

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

  /* ================================================================ */
  /*  §6 Canvas-drawn butterfly wing sprites                           */
  /* ================================================================ */

  private createButterflyTexture(): CanvasTexture {
    const size = 128;
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const ctx = c.getContext('2d')!;

    const grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, '#00e6ff');
    grad.addColorStop(0.6, 'rgba(0,180,255,0.5)');
    grad.addColorStop(1, 'rgba(0,180,255,0)');

    // Draw two symmetrical wings with bezier curves
    ctx.fillStyle = grad;

    // Right wing
    ctx.beginPath();
    ctx.moveTo(64, 64);
    ctx.bezierCurveTo(90, 20, 125, 30, 110, 64);
    ctx.bezierCurveTo(125, 98, 90, 108, 64, 64);
    ctx.fill();

    // Left wing
    ctx.beginPath();
    ctx.moveTo(64, 64);
    ctx.bezierCurveTo(38, 20, 3, 30, 18, 64);
    ctx.bezierCurveTo(3, 98, 38, 108, 64, 64);
    ctx.fill();

    // Wing veins – subtle lighter lines
    ctx.strokeStyle = 'rgba(150,240,255,0.35)';
    ctx.lineWidth = 0.7;
    // Right
    ctx.beginPath();
    ctx.moveTo(64, 64);
    ctx.quadraticCurveTo(95, 40, 108, 55);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(64, 64);
    ctx.quadraticCurveTo(95, 85, 108, 73);
    ctx.stroke();
    // Left
    ctx.beginPath();
    ctx.moveTo(64, 64);
    ctx.quadraticCurveTo(33, 40, 20, 55);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(64, 64);
    ctx.quadraticCurveTo(33, 85, 20, 73);
    ctx.stroke();

    const tex = new CanvasTexture(c);
    tex.minFilter = LinearFilter;
    return tex;
  }

  private buildButterflyWingSprites(): void {
    const count = this.isMobile ? 4 : 8;
    const tex = this.createButterflyTexture();

    for (let i = 0; i < count; i++) {
      const mat = new SpriteMaterial({
        map: tex,
        transparent: true,
        opacity: 0.85,
        blending: AdditiveBlending,
        depthWrite: false,
      });
      const sprite = new Sprite(mat);
      const baseScale = 0.35 + Math.random() * 0.25;
      sprite.scale.set(baseScale, baseScale, 1);
      this.treeGroup.add(sprite);

      this.butterflies.push({
        sprite,
        center: new Vector3(0, 1.8 + Math.random() * 1.5, 0),
        radius: 1.4 + Math.random() * 1.8,
        speed: 0.3 + Math.random() * 0.35,
        offsetY: 0.3 + Math.random() * 0.8,
        phase: Math.random() * Math.PI * 2 * 10,
        baseScaleX: baseScale,
      });
    }
  }

  /* ================================================================ */
  /*  §7 Falling / drifting particles                                  */
  /* ================================================================ */

  private buildFallingParticles(): void {
    const count = this.isMobile ? 150 : 300;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const alphas = new Float32Array(count);
    this.fallingSpeeds = new Float32Array(count);
    this.fallingSwayPhases = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 8;
      positions[i * 3 + 1] = GROUND_Y + Math.random() * 9.5; // y: -1.5 to 8
      positions[i * 3 + 2] = (Math.random() - 0.5) * 8;
      sizes[i] = 0.8 + Math.random() * 1.2;
      alphas[i] = 0.15 + Math.random() * 0.25;
      this.fallingSpeeds[i] = 0.15 + Math.random() * 0.25;
      this.fallingSwayPhases[i] = Math.random() * Math.PI * 2;
    }

    const geom = new BufferGeometry();
    geom.setAttribute('position', new Float32BufferAttribute(positions, 3));
    geom.setAttribute('aSize', new Float32BufferAttribute(sizes, 1));
    geom.setAttribute('aAlpha', new Float32BufferAttribute(alphas, 1));

    this.fallingParticles = new Points(geom, this.makeParticleMaterial(new Color(0.5, 0.8, 1.0)));
    this.fallingPositions = positions;
    this.treeGroup.add(this.fallingParticles);
  }

  /* ================================================================ */
  /*  §8 Volume fog sprites                                            */
  /* ================================================================ */

  private buildVolumeFogSprites(): void {
    const fogCount = this.isMobile ? 4 : 6;

    // Canvas: soft gaussian blur circle
    const createFogTexture = (): CanvasTexture => {
      const size = 256;
      const c = document.createElement('canvas');
      c.width = size;
      c.height = size;
      const ctx = c.getContext('2d')!;
      const half = size / 2;
      const grad = ctx.createRadialGradient(half, half, 0, half, half, half);
      grad.addColorStop(0, 'rgba(10,26,58,0.55)');
      grad.addColorStop(0.4, 'rgba(10,26,58,0.3)');
      grad.addColorStop(0.7, 'rgba(10,26,58,0.1)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);
      const tex = new CanvasTexture(c);
      tex.minFilter = LinearFilter;
      return tex;
    };

    const tex = createFogTexture();

    const fogPositions = [
      new Vector3(-1.5, 3.8, 1.0),
      new Vector3(1.8, 3.2, -0.8),
      new Vector3(0, 4.2, 0.5),
      new Vector3(-0.8, 2.8, -1.2),
      new Vector3(1.2, 4.0, 1.5),
      new Vector3(-1.0, 3.5, -0.3),
    ];

    for (let i = 0; i < fogCount; i++) {
      const baseOpacity = 0.08 + Math.random() * 0.04;
      const mat = new SpriteMaterial({
        map: tex,
        transparent: true,
        opacity: baseOpacity,
        blending: AdditiveBlending,
        depthWrite: false,
      });
      const sprite = new Sprite(mat);
      const scale = 3.5 + Math.random() * 3.0;
      sprite.scale.set(scale, scale, 1);
      sprite.position.copy(fogPositions[i % fogPositions.length]);
      this.treeGroup.add(sprite);
      this.fogSprites.push({
        sprite,
        baseOpacity,
        rotSpeed: 0.05 + Math.random() * 0.08,
      });
    }
  }

  /* ================================================================ */
  /*  §4a Water surface plane                                          */
  /* ================================================================ */

  private buildWaterSurface(): void {
    const geom = new PlaneGeometry(30, 30);
    const mat = new MeshBasicMaterial({
      color: 0x020810,
      transparent: true,
      opacity: 0.4,
      side: DoubleSide,
      depthWrite: false,
    });
    const plane = new Mesh(geom, mat);
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = GROUND_Y;
    this.scene.add(plane);
  }

  /* ================================================================ */
  /*  §4b Water surface reflection                                     */
  /* ================================================================ */

  private buildReflection(): void {
    this.reflectionGroup = new Group();

    // Deep-clone every child of treeGroup into reflectionGroup
    this.treeGroup.children.forEach((child) => {
      const cloned = child.clone();

      // Reduce opacity of cloned materials
      const reduceMaterialOpacity = (obj: any) => {
        if (obj.material) {
          // Clone material so we don't mutate the original
          if (Array.isArray(obj.material)) {
            obj.material = obj.material.map((m: any) => {
              const mc = m.clone();
              mc.opacity = Math.min(mc.opacity * 0.22, 0.2);
              return mc;
            });
          } else {
            obj.material = obj.material.clone();
            // ShaderMaterial opacity is in the shader; for basic / sprite we reduce opacity
            if (obj.material.opacity !== undefined) {
              obj.material.opacity = Math.min(obj.material.opacity * 0.22, 0.2);
            }
            // For ShaderMaterial uniforms, we can't easily reduce; we'll rely on the visual being faint
          }
        }
        if (obj.children) {
          obj.children.forEach(reduceMaterialOpacity);
        }
      };

      reduceMaterialOpacity(cloned);
      this.reflectionGroup.add(cloned);
    });

    // Mirror: flip Y, position below ground
    this.reflectionGroup.scale.set(1, -1, 1);
    this.reflectionGroup.position.y = GROUND_Y * 2; // -3.0
    this.scene.add(this.reflectionGroup);
  }

  /* ================================================================ */
  /*  §4c Water surface particles                                      */
  /* ================================================================ */

  private buildWaterSurfaceParticles(): void {
    const count = 500;
    const { geom, basePositions } = this.buildParticleGeometry(count, () => ({
      x: (Math.random() - 0.5) * 14,
      y: GROUND_Y + (Math.random() - 0.5) * 0.05,
      z: (Math.random() - 0.5) * 14,
      size: 0.6 + Math.random() * 1.0,
      alpha: 0.08 + Math.random() * 0.12,
    }));
    const mat = this.makeParticleMaterial(new Color(0.15, 0.35, 0.7));
    this.waterParticles = new Points(geom, mat);
    this.waterBasePositions = basePositions;
    this.scene.add(this.waterParticles);
  }

  /* ================================================================ */
  /*  §4d Ripple rings                                                 */
  /* ================================================================ */

  private buildRippleRings(): void {
    const ringCount = 3;
    for (let i = 0; i < ringCount; i++) {
      // Torus-like ring using a thin tube around a circle
      const radius = 0.5 + i * 0.6;
      const curve = new CatmullRomCurve3(
        Array.from({ length: 33 }, (_, k) => {
          const a = (k / 32) * Math.PI * 2;
          return new Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius);
        }),
        true,
      );
      const geom = new TubeGeometry(curve, 64, 0.008, 4, true);
      const mat = new MeshBasicMaterial({
        color: 0x1a4a8a,
        transparent: true,
        opacity: 0.18 - i * 0.04,
        blending: AdditiveBlending,
        depthWrite: false,
      });
      const ring = new Mesh(geom, mat);
      ring.position.y = GROUND_Y + 0.01;
      this.scene.add(ring);
      this.rippleRings.push(ring);
    }
  }

  /* ================================================================ */
  /*  §5 Enhanced multi-layered moon (4 glow layers)                   */
  /* ================================================================ */

  private buildMultiLayeredMoon(): void {
    this.moonGroup = new Group();
    this.moonGroup.position.set(this.isMobile ? 2.0 : 3.5, this.isMobile ? 4.5 : 5.0, -6);

    // Core sphere
    const moonGeom = new SphereGeometry(0.9, 32, 32);
    const moonMat = new MeshBasicMaterial({ color: 0xd9ebff });
    this.moonGroup.add(new Mesh(moonGeom, moonMat));

    // Mid glow
    const midTex = this.createGlowTexture('#3399ff');
    const midMat = new SpriteMaterial({
      map: midTex,
      transparent: true,
      opacity: 0.5,
      blending: AdditiveBlending,
    });
    this.moonMidGlow = new Sprite(midMat);
    this.moonMidGlow.scale.set(5, 5, 1);
    this.moonGroup.add(this.moonMidGlow);

    // Outer glow
    const outerTex = this.createGlowTexture('#0033ff');
    const outerMat = new SpriteMaterial({
      map: outerTex,
      transparent: true,
      opacity: 0.3,
      blending: AdditiveBlending,
    });
    this.moonOuterGlow = new Sprite(outerMat);
    this.moonOuterGlow.scale.set(9, 9, 1);
    this.moonGroup.add(this.moonOuterGlow);

    // Ultra outer glow
    const ultraTex = this.createGlowTexture('#001177', 128);
    const ultraMat = new SpriteMaterial({
      map: ultraTex,
      transparent: true,
      opacity: 0.15,
      blending: AdditiveBlending,
    });
    this.moonUltraGlow = new Sprite(ultraMat);
    this.moonUltraGlow.scale.set(14, 14, 1);
    this.moonGroup.add(this.moonUltraGlow);

    this.scene.add(this.moonGroup);
  }

  /* ================================================================ */
  /*  §11 Star field                                                   */
  /* ================================================================ */

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

  /* ================================================================ */
  /*  Event binding                                                    */
  /* ================================================================ */

  private bindEvents(): void {
    this.resizeHandler = () => this.resizeRenderer();
    window.addEventListener('resize', this.resizeHandler);

    this.mouseMoveHandler = (e: MouseEvent) => {
      const mx = (e.clientX / window.innerWidth) * 2 - 1;
      const my = -(e.clientY / window.innerHeight) * 2 + 1;
      this.targetRotY = mx * 0.08;
      this.targetRotX = -my * 0.05;
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

  /* ================================================================ */
  /*  Animation loop                                                   */
  /* ================================================================ */

  private animate(): void {
    if (this.disposed) return;
    this.animationId = requestAnimationFrame(() => this.animate());

    const elapsed = this.clock.getElapsedTime();
    const delta = this.clock.getDelta();
    const sf = this.speedFactor;

    // §13 Mouse parallax on treeGroup
    this.treeGroup.rotation.y += (this.targetRotY - this.treeGroup.rotation.y) * 0.05 * sf;
    this.treeGroup.rotation.x += (this.targetRotX - this.treeGroup.rotation.x) * 0.05 * sf;
    this.treeGroup.rotation.z = Math.sin(elapsed * 0.26 * sf) * 0.008 * sf;

    // Crown wind-field animation
    this.animateCrown(elapsed, sf);

    // Fireflies
    this.animateFireflies(elapsed, sf);

    // Rising sparks
    this.animateSparks(elapsed, delta, sf);

    // Butterfly wing flap
    this.animateButterflies(elapsed, sf);

    // Falling particles
    this.animateFallingParticles(elapsed, delta, sf);

    // Volume fog
    this.animateVolumeFog(elapsed, sf);

    // Moon halo pulse
    this.animateMoonPulse(elapsed, sf);

    // Water surface particles drift
    this.animateWaterParticles(elapsed, sf);

    // Ripple rings animation
    this.animateRippleRings(elapsed, sf);

    // Reflection follows treeGroup rotation but stays mirrored
    if (this.reflectionGroup) {
      this.reflectionGroup.rotation.x = this.treeGroup.rotation.x;
      this.reflectionGroup.rotation.y = this.treeGroup.rotation.y;
      this.reflectionGroup.rotation.z = this.treeGroup.rotation.z;
      // Wave distortion: slight sinusoidal y offset
      this.reflectionGroup.position.y = GROUND_Y * 2 + Math.sin(elapsed * 0.8 * sf) * 0.03;
    }

    this.composer.render();
  }

  /* ---------- Crown wind-field ---------- */
  private animateCrown(elapsed: number, sf: number): void {
    this.crownSystems.forEach((sys) => {
      const posAttr = sys.points.geometry.getAttribute('position') as Float32BufferAttribute;
      const arr = posAttr.array as Float32Array;
      const count = arr.length / 3;

      for (let i = 0; i < count; i++) {
        const bx = sys.basePositions[i * 3];
        const by = sys.basePositions[i * 3 + 1];
        const bz = sys.basePositions[i * 3 + 2];

        const ts = elapsed * 0.38 * sf + i * 0.0001;
        const angle = ts + by * 0.4;
        const offsetR = Math.sin(ts * 1.6 + bx * 0.28) * 0.18;

        arr[i * 3] = bx + Math.sin(angle) * (0.16 + offsetR);
        arr[i * 3 + 1] = by + Math.sin(ts * 1.3 + bz * 0.35) * 0.12;
        arr[i * 3 + 2] = bz + Math.cos(angle) * (0.16 + offsetR);
      }
      posAttr.needsUpdate = true;
    });
  }

  /* ---------- Fireflies ---------- */
  private animateFireflies(elapsed: number, sf: number): void {
    if (!this.fireflies) return;
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

  /* ---------- Rising sparks ---------- */
  private animateSparks(elapsed: number, delta: number, sf: number): void {
    if (!this.sparks) return;
    const posAttr = this.sparks.geometry.getAttribute('position') as Float32BufferAttribute;
    const arr = posAttr.array as Float32Array;
    const count = arr.length / 3;
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 1] += this.sparkSpeeds[i] * delta * 1.6 * sf;
      arr[i * 3] += Math.sin(elapsed * 2.2 + i) * 0.003;
      if (arr[i * 3 + 1] > 4.5) {
        arr[i * 3 + 1] = -1.5;
        arr[i * 3] = (Math.random() - 0.5) * 0.5;
      }
    }
    posAttr.needsUpdate = true;
  }

  /* ---------- Butterflies wing flap ---------- */
  private animateButterflies(elapsed: number, sf: number): void {
    this.butterflies.forEach((bf) => {
      bf.phase += bf.speed * 0.016 * sf;
      const x = bf.center.x + Math.cos(bf.phase) * bf.radius;
      const z = bf.center.z + Math.sin(bf.phase) * bf.radius;
      const y = bf.center.y + Math.sin(bf.phase * 2.4) * bf.offsetY;
      bf.sprite.position.set(x, y, z);

      // Wing flap: scaleX oscillates between 0.3 and 1.0
      const flapFactor = 0.65 + Math.sin(bf.phase * 15.0) * 0.35; // 0.3 – 1.0
      bf.sprite.scale.set(bf.baseScaleX * flapFactor, bf.baseScaleX, 1);
    });
  }

  /* ---------- Falling particles ---------- */
  private animateFallingParticles(elapsed: number, delta: number, sf: number): void {
    if (!this.fallingParticles) return;
    const posAttr = this.fallingParticles.geometry.getAttribute(
      'position',
    ) as Float32BufferAttribute;
    const arr = posAttr.array as Float32Array;
    const count = arr.length / 3;
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 1] -= this.fallingSpeeds[i] * delta * sf;
      // Horizontal sway
      arr[i * 3] += Math.sin(elapsed * 0.5 + this.fallingSwayPhases[i]) * 0.002;
      arr[i * 3 + 2] += Math.cos(elapsed * 0.4 + this.fallingSwayPhases[i] * 1.3) * 0.002;

      if (arr[i * 3 + 1] < GROUND_Y) {
        arr[i * 3 + 1] = 5.0 + Math.random() * 3.0;
        arr[i * 3] = (Math.random() - 0.5) * 8;
        arr[i * 3 + 2] = (Math.random() - 0.5) * 8;
      }
    }
    posAttr.needsUpdate = true;
  }

  /* ---------- Volume fog ---------- */
  private animateVolumeFog(elapsed: number, sf: number): void {
    this.fogSprites.forEach((f) => {
      // Pulse opacity
      const mat = f.sprite.material as SpriteMaterial;
      mat.opacity = f.baseOpacity + Math.sin(elapsed * f.rotSpeed * 4.0 * sf) * 0.03;
      // Slow rotate (sprites face camera, so we move them gently)
      f.sprite.position.x += Math.sin(elapsed * f.rotSpeed * sf) * 0.001;
      f.sprite.position.z += Math.cos(elapsed * f.rotSpeed * 0.7 * sf) * 0.001;
    });
  }

  /* ---------- Moon halo pulse ---------- */
  private animateMoonPulse(elapsed: number, sf: number): void {
    if (!this.moonMidGlow || !this.moonOuterGlow || !this.moonUltraGlow) return;
    const pulse = 1.0 + Math.sin(elapsed * 0.6 * sf) * 0.06;
    this.moonMidGlow.scale.set(5 * pulse, 5 * pulse, 1);
    this.moonOuterGlow.scale.set(9 * pulse, 9 * pulse, 1);
    this.moonUltraGlow.scale.set(14 * pulse, 14 * pulse, 1);
  }

  /* ---------- Water surface particles ---------- */
  private animateWaterParticles(elapsed: number, sf: number): void {
    if (!this.waterParticles) return;
    const posAttr = this.waterParticles.geometry.getAttribute('position') as Float32BufferAttribute;
    const arr = posAttr.array as Float32Array;
    const count = arr.length / 3;
    for (let i = 0; i < count; i++) {
      const bx = this.waterBasePositions[i * 3];
      const bz = this.waterBasePositions[i * 3 + 2];
      arr[i * 3] = bx + Math.sin(elapsed * 0.15 * sf + i * 0.3) * 0.08;
      arr[i * 3 + 2] = bz + Math.cos(elapsed * 0.12 * sf + i * 0.2) * 0.08;
    }
    posAttr.needsUpdate = true;
  }

  /* ---------- Ripple rings ---------- */
  private animateRippleRings(elapsed: number, sf: number): void {
    this.rippleRings.forEach((ring, i) => {
      const baseScale = 1.0 + i * 0.3;
      const pulse = baseScale + Math.sin(elapsed * 0.5 * sf + i * 1.5) * 0.15;
      ring.scale.set(pulse, 1, pulse);
      const mat = ring.material as MeshBasicMaterial;
      mat.opacity = (0.18 - i * 0.04) * (0.7 + Math.sin(elapsed * 0.7 * sf + i * 2.0) * 0.3);
    });
  }
}
