import {
  AdditiveBlending,
  BufferGeometry,
  CanvasTexture,
  CatmullRomCurve3,
  Clock,
  Color,
  CircleGeometry,
  CylinderGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  LinearFilter,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshBasicMaterial,
  MultiplyBlending,
  PerspectiveCamera,
  PlaneGeometry,
  Points,
  RingGeometry,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  Texture,
  TubeGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';

import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

interface ParticleSystem {
  points: Points;
  base: Float32Array;
  kind: 'crown' | 'firefly' | 'falling' | 'trunk' | 'trunkVolume';
  strength: number;
}

interface Butterfly {
  sprite: Sprite;
  glow: Sprite;
  core: Sprite;
  trails: Sprite[];
  phase: number;
  speed: number;
  radiusX: number;
  radiusY: number;
  center: Vector3;
  scale: number;
  foreground: boolean;
  path: 'sky' | 'canopy' | 'foreground';
  altitude: number;
  depth: number;
}

interface LeafSprite extends Sprite {
  userData: {
    baseOpacity: number;
    shimmer: number;
    phase: number;
  };
}

const BRANCHES = [
  [new Vector3(0.0, -1.08, 0), new Vector3(0.12, 0.1, 0.05), new Vector3(0.0, 1.35, 0)],
  [new Vector3(0, 0.25, 0), new Vector3(0.72, 1.15, 0.18), new Vector3(1.7, 2.45, 0.22)],
  [new Vector3(0, 0.4, 0), new Vector3(-0.76, 1.18, -0.12), new Vector3(-1.78, 2.5, -0.2)],
  [new Vector3(0.05, 0.68, 0.02), new Vector3(0.94, 1.4, 0.5), new Vector3(1.92, 2.2, 0.92)],
  [new Vector3(-0.04, 0.72, -0.02), new Vector3(-0.9, 1.46, -0.44), new Vector3(-1.72, 2.28, -0.9)],
  [new Vector3(0.0, 1.0, 0.04), new Vector3(0.4, 1.9, 0.86), new Vector3(0.86, 3.0, 1.22)],
  [new Vector3(0.0, 1.0, -0.04), new Vector3(-0.45, 1.9, -0.76), new Vector3(-1.0, 3.0, -1.1)],
  [new Vector3(0, 1.2, 0), new Vector3(0.1, 2.1, 0.08), new Vector3(0.0, 3.35, 0.0)],
];

const CROWN_LOBES = [
  { cx: 0, cy: 3.02, cz: 0, rx: 3.05, ry: 0.96, rz: 1.78, count: 15000 },
  { cx: -1.62, cy: 2.76, cz: -0.08, rx: 1.66, ry: 0.82, rz: 1.22, count: 7000 },
  { cx: 1.66, cy: 2.74, cz: 0.08, rx: 1.7, ry: 0.82, rz: 1.22, count: 7000 },
  { cx: -0.62, cy: 3.48, cz: 0.72, rx: 1.36, ry: 0.76, rz: 1.2, count: 4700 },
  { cx: 0.78, cy: 3.42, cz: -0.72, rx: 1.36, ry: 0.74, rz: 1.2, count: 4700 },
  { cx: 0.08, cy: 3.72, cz: 0.08, rx: 1.9, ry: 0.62, rz: 1.18, count: 5200 },
  { cx: -2.28, cy: 2.35, cz: 0.22, rx: 0.98, ry: 0.62, rz: 0.86, count: 3200 },
  { cx: 2.32, cy: 2.34, cz: -0.18, rx: 1.02, ry: 0.62, rz: 0.86, count: 3200 },
  { cx: -0.2, cy: 2.42, cz: 1.0, rx: 1.7, ry: 0.7, rz: 0.84, count: 4200 },
  { cx: -2.62, cy: 2.92, cz: -0.18, rx: 0.78, ry: 0.54, rz: 0.72, count: 2400 },
  { cx: 2.62, cy: 2.9, cz: 0.18, rx: 0.8, ry: 0.54, rz: 0.72, count: 2400 },
  { cx: -0.85, cy: 2.92, cz: -1.2, rx: 1.55, ry: 0.82, rz: 0.72, count: 5200 },
  { cx: 0.95, cy: 2.86, cz: 1.28, rx: 1.62, ry: 0.78, rz: 0.76, count: 5200 },
  { cx: -1.85, cy: 2.58, cz: -0.92, rx: 1.02, ry: 0.62, rz: 0.74, count: 3400 },
  { cx: 1.9, cy: 2.54, cz: 0.96, rx: 1.06, ry: 0.62, rz: 0.74, count: 3400 },
];

export class MoonTreeScene {
  private scene!: Scene;
  private camera!: PerspectiveCamera;
  private renderer!: WebGLRenderer;
  private composer!: EffectComposer;
  private bloomPass: UnrealBloomPass | null = null;
  private clock = new Clock();
  private treeGroup = new Group();
  private particleSystems: ParticleSystem[] = [];
  private butterflies: Butterfly[] = [];
  private leafSprites: LeafSprite[] = [];
  private leafMeshes: Mesh[] = [];
  private canopyVolumeMeshes: Mesh[] = [];
  private textures: Texture[] = [];
  private animatedMaterials: ShaderMaterial[] = [];
  private energyCore: Sprite | null = null;
  private moonGlow: Sprite | null = null;
  private waterGroup = new Group();
  private reflectionSprites: Sprite[] = [];
  private reflectionLines: Line[] = [];
  private waterRipples: Mesh[] = [];
  private butterflyReflections: Sprite[] = [];
  private crownSparkles: Sprite[] = [];
  private canopyGlowPatches: Sprite[] = [];
  private trunkGlowNodes: Sprite[] = [];
  private blueHazeSprites: Sprite[] = [];
  private moonRaySprites: Sprite[] = [];
  private canopyRimSprites: Sprite[] = [];
  private floatingGlowOrbs: Sprite[] = [];
  private animationId: number | null = null;
  private resizeHandler!: () => void;
  private pointerMoveHandler!: (event: PointerEvent) => void;
  private pointerDownHandler!: (event: PointerEvent) => void;
  private pointerUpHandler!: (event: PointerEvent) => void;
  private contextLostHandler: ((event: Event) => void) | null = null;
  private disposed = false;
  private pointer = new Vector2();
  private isDragging = false;
  private lastDragX = 0;
  private lastDragY = 0;
  private targetRotationX = 0;
  private targetRotationY = -0.32;
  private zoomOffset = 0;
  private rotationControlActive = false;
  private brightnessPercent = 56;
  private readonly waterY = -1.14;
  private readonly isMobile = window.innerWidth < 768;
  private readonly reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  constructor(private canvas: HTMLCanvasElement) {}

  init(): void {
    this.scene = new Scene();
    this.camera = new PerspectiveCamera(40, 1, 0.1, 180);
    this.camera.position.set(0, 1.0, this.isMobile ? 11.7 : 11.9);

    this.renderer = new WebGLRenderer({
      canvas: this.canvas,
      alpha: false,
      antialias: !this.isMobile,
      powerPreference: 'high-performance',
    });
    this.contextLostHandler = (event: Event) => event.preventDefault();
    this.renderer.domElement.addEventListener('webglcontextlost', this.contextLostHandler);
    this.renderer.setClearColor(0x000000, 1);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.isMobile ? 1.35 : 2));

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloomPass = new UnrealBloomPass(
      new Vector2(this.canvas.clientWidth, this.canvas.clientHeight),
      this.isMobile ? 0.04 : 0.065,
      0.18,
      0.78,
    );
    this.composer.addPass(this.bloomPass);
    this.composer.addPass(new OutputPass());
    this.applyBrightness();

    this.treeGroup.position.y = this.isMobile ? -0.24 : -0.18;
    this.treeGroup.rotation.y = this.targetRotationY;
    this.scene.add(this.treeGroup);

    this.buildStarCurtain();
    this.buildFloatingGlowOrbs();
    this.buildDeepBlueMoon();
    this.buildMoonlightRays();
    this.buildTreeSkeleton();
    this.buildCanopyVolumeCore();
    this.buildLeafCanopy();
    this.buildDimensionalLeafShell();
    this.buildSilverLeafDepthLayer();
    this.buildCanopyBranchLattice();
    this.buildCanopyRimLights();
    this.buildCrownSparkles();
    this.buildCanopyGlowPatches();
    this.buildTreeParticles();
    this.buildEnergyCore();
    this.buildButterflies();
    this.buildWaterAndReflection();
    this.buildButterflyReflections();
    this.buildBlueHaze();
    this.bindEvents();
    this.resizeRenderer();
    this.animate();
  }

  private makeRadialTexture(stops: Array<[number, string]>): CanvasTexture {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    const ctx = c.getContext('2d')!;
    const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    stops.forEach(([offset, color]) => g.addColorStop(offset, color));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    const texture = new CanvasTexture(c);
    texture.minFilter = LinearFilter;
    this.textures.push(texture);
    return texture;
  }

  private makeHorizontalGlowTexture(): CanvasTexture {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 128;
    const ctx = c.getContext('2d')!;
    ctx.clearRect(0, 0, c.width, c.height);

    const horizontal = ctx.createLinearGradient(0, 64, 512, 64);
    horizontal.addColorStop(0, 'rgba(0,0,0,0)');
    horizontal.addColorStop(0.18, 'rgba(34,86,230,0.12)');
    horizontal.addColorStop(0.5, 'rgba(185,224,255,0.34)');
    horizontal.addColorStop(0.82, 'rgba(34,86,230,0.12)');
    horizontal.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = horizontal;
    ctx.fillRect(0, 0, 512, 128);

    const vertical = ctx.createLinearGradient(256, 0, 256, 128);
    vertical.addColorStop(0, 'rgba(0,0,0,0)');
    vertical.addColorStop(0.48, 'rgba(255,255,255,0.9)');
    vertical.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalCompositeOperation = 'destination-in';
    ctx.fillStyle = vertical;
    ctx.fillRect(0, 0, 512, 128);

    const texture = new CanvasTexture(c);
    texture.minFilter = LinearFilter;
    this.textures.push(texture);
    return texture;
  }

  private makeButterflyTexture(): CanvasTexture {
    const c = document.createElement('canvas');
    c.width = 320;
    c.height = 220;
    const ctx = c.getContext('2d')!;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.translate(160, 112);

    const drawWing = (side: -1 | 1) => {
      const upper = ctx.createRadialGradient(side * 35, -28, 4, side * 66, -40, 90);
      upper.addColorStop(0, 'rgba(245,252,255,0.72)');
      upper.addColorStop(0.14, 'rgba(146,198,255,0.52)');
      upper.addColorStop(0.5, 'rgba(46,98,235,0.26)');
      upper.addColorStop(0.78, 'rgba(4,20,112,0.12)');
      upper.addColorStop(1, 'rgba(0,8,72,0)');
      ctx.fillStyle = upper;
      ctx.beginPath();
      ctx.moveTo(side * 5, -8);
      ctx.bezierCurveTo(side * 24, -82, side * 104, -88, side * 142, -28);
      ctx.bezierCurveTo(side * 112, 2, side * 43, 18, side * 5, 2);
      ctx.closePath();
      ctx.fill();

      const lower = ctx.createRadialGradient(side * 34, 25, 4, side * 72, 42, 78);
      lower.addColorStop(0, 'rgba(225,245,255,0.55)');
      lower.addColorStop(0.2, 'rgba(92,156,255,0.38)');
      lower.addColorStop(0.66, 'rgba(18,46,156,0.18)');
      lower.addColorStop(1, 'rgba(0,6,60,0)');
      ctx.fillStyle = lower;
      ctx.beginPath();
      ctx.moveTo(side * 3, 3);
      ctx.bezierCurveTo(side * 42, 18, side * 114, 26, side * 128, 70);
      ctx.bezierCurveTo(side * 80, 86, side * 22, 54, side * 3, 10);
      ctx.closePath();
      ctx.fill();

      ctx.save();
      ctx.shadowColor = '#dcefff';
      ctx.shadowBlur = 10;
      ctx.strokeStyle = 'rgba(225,242,255,0.86)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(side * 5, -8);
      ctx.bezierCurveTo(side * 24, -82, side * 104, -88, side * 142, -28);
      ctx.bezierCurveTo(side * 112, 2, side * 43, 18, side * 5, 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(side * 3, 3);
      ctx.bezierCurveTo(side * 42, 18, side * 114, 26, side * 128, 70);
      ctx.bezierCurveTo(side * 80, 86, side * 22, 54, side * 3, 10);
      ctx.stroke();
      ctx.restore();
    };

    drawWing(-1);
    drawWing(1);

    ctx.shadowColor = '#7fb1ff';
    ctx.shadowBlur = 6;
    ctx.strokeStyle = 'rgba(185,220,255,0.72)';
    ctx.lineWidth = 1.25;
    for (const side of [-1, 1]) {
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(side * 2, -4);
      ctx.quadraticCurveTo(side * 50, -58, side * 126, -35);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(side * 4, -2);
      ctx.quadraticCurveTo(side * 62, -22, side * 108, -4);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(side * 4, 5);
      ctx.quadraticCurveTo(side * 48, 30, side * 112, 60);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(side * 24, 18);
      ctx.quadraticCurveTo(side * 66, 42, side * 104, 52);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(245,252,255,0.52)';
      ctx.lineWidth = 0.9;
      for (let i = 0; i < 5; i++) {
        const spread = -48 + i * 22;
        ctx.beginPath();
        ctx.moveTo(side * 5, -3);
        ctx.quadraticCurveTo(side * (38 + i * 12), spread, side * (84 + i * 8), spread * 0.58);
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(185,220,255,0.72)';
      ctx.lineWidth = 1.25;
    }

    ctx.shadowBlur = 18;
    ctx.fillStyle = 'rgba(255,255,255,0.96)';
    ctx.beginPath();
    ctx.ellipse(0, 2, 6, 36, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 26;
    ctx.fillStyle = 'rgba(164,212,255,0.36)';
    ctx.beginPath();
    ctx.ellipse(0, 6, 26, 22, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(190,225,255,0.68)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-2, -30);
    ctx.quadraticCurveTo(-18, -52, -36, -54);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(2, -30);
    ctx.quadraticCurveTo(18, -52, 36, -54);
    ctx.stroke();

    const texture = new CanvasTexture(c);
    texture.minFilter = LinearFilter;
    this.textures.push(texture);
    return texture;
  }

  private makeLeafClusterTexture(): CanvasTexture {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 160;
    const ctx = c.getContext('2d')!;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.translate(128, 82);

    for (let i = 0; i < 48; i++) {
      const x = (Math.random() - 0.5) * 210;
      const y = (Math.random() - 0.5) * 112;
      const s = 0.42 + Math.random() * 0.86;
      const r = Math.random() * Math.PI;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(r);
      ctx.scale(s, s);
      const brightLeaf = i % 6 === 0;
      ctx.shadowColor = brightLeaf ? '#74a7ff' : '#1c4dff';
      ctx.shadowBlur = brightLeaf ? 8 : 2.2;

      const g = ctx.createLinearGradient(-16, -8, 18, 8);
      g.addColorStop(0, brightLeaf ? 'rgba(14,44,158,0.38)' : 'rgba(2,9,50,0.24)');
      g.addColorStop(0.44, brightLeaf ? 'rgba(52,104,255,0.78)' : 'rgba(18,58,190,0.58)');
      g.addColorStop(1, brightLeaf ? 'rgba(160,202,255,0.52)' : 'rgba(82,132,255,0.38)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(-18, 0);
      ctx.bezierCurveTo(-8, -13, 13, -11, 23, 0);
      ctx.bezierCurveTo(10, 10, -9, 13, -18, 0);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = brightLeaf ? 'rgba(205,230,255,0.72)' : i % 4 === 0 ? 'rgba(150,190,255,0.5)' : 'rgba(66,112,255,0.34)';
      ctx.lineWidth = brightLeaf ? 0.8 : 0.62;
      ctx.beginPath();
      ctx.moveTo(-14, 0);
      ctx.lineTo(18, 0);
      ctx.stroke();
      if (i % 3 === 0) {
        ctx.beginPath();
        ctx.moveTo(-2, 0);
        ctx.quadraticCurveTo(8, -6, 16, -5);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(8, 6, 15, 5);
        ctx.stroke();
      }
      ctx.restore();
    }

    const texture = new CanvasTexture(c);
    texture.minFilter = LinearFilter;
    this.textures.push(texture);
    return texture;
  }

  private makeSingleLeafTexture(): CanvasTexture {
    const c = document.createElement('canvas');
    c.width = 192;
    c.height = 96;
    const ctx = c.getContext('2d')!;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.translate(96, 48);

    ctx.shadowColor = '#4d8cff';
    ctx.shadowBlur = 8;
    const g = ctx.createLinearGradient(-74, -18, 72, 22);
    g.addColorStop(0, 'rgba(1,7,46,0.08)');
    g.addColorStop(0.32, 'rgba(18,58,180,0.58)');
    g.addColorStop(0.72, 'rgba(72,132,255,0.76)');
    g.addColorStop(1, 'rgba(210,235,255,0.46)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-78, 0);
    ctx.bezierCurveTo(-42, -38, 42, -35, 82, -3);
    ctx.bezierCurveTo(36, 34, -42, 36, -78, 0);
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 5;
    ctx.strokeStyle = 'rgba(220,240,255,0.72)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-68, 0);
    ctx.quadraticCurveTo(-8, -2, 70, -2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(130,180,255,0.58)';
    ctx.lineWidth = 0.9;
    for (let i = 0; i < 8; i++) {
      const x = -48 + i * 16;
      ctx.beginPath();
      ctx.moveTo(x, -1);
      ctx.quadraticCurveTo(x + 16, -12 - Math.random() * 8, x + 32, -12 + Math.random() * 6);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, 1);
      ctx.quadraticCurveTo(x + 16, 12 + Math.random() * 8, x + 32, 10 - Math.random() * 5);
      ctx.stroke();
    }

    ctx.shadowBlur = 14;
    ctx.fillStyle = 'rgba(230,246,255,0.34)';
    ctx.beginPath();
    ctx.ellipse(38, -5, 18, 8, -0.2, 0, Math.PI * 2);
    ctx.fill();

    const texture = new CanvasTexture(c);
    texture.minFilter = LinearFilter;
    this.textures.push(texture);
    return texture;
  }

  private makeParticleMaterial(color: Color, sizeScale: number, time = false): ShaderMaterial {
    const material = new ShaderMaterial({
      uniforms: {
        uColor: { value: color },
        uTime: { value: 0 },
        uSizeScale: { value: sizeScale },
      },
      vertexShader: `
        attribute float aSize;
        attribute float aAlpha;
        varying float vAlpha;
        uniform float uTime;
        uniform float uSizeScale;
        void main() {
          vAlpha = aAlpha;
          vec3 p = position;
          vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
          float shimmer = ${time ? '0.82 + sin(uTime * 2.0 + position.y * 9.0 + aAlpha * 31.0) * 0.18' : '1.0'};
          gl_PointSize = aSize * uSizeScale * shimmer * (58.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        varying float vAlpha;
        void main() {
          float d = length(gl_PointCoord - 0.5) * 2.0;
          float soft = smoothstep(1.0, 0.0, d);
          float core = smoothstep(0.26, 0.0, d);
          vec3 color = mix(uColor, vec3(0.36, 0.56, 1.0), core * 0.18);
          gl_FragColor = vec4(color, soft * vAlpha * 0.48);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    if (time) this.animatedMaterials.push(material);
    return material;
  }

  private makeWaterGlowMaterial(): ShaderMaterial {
    const material = new ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColorDeep: { value: new Color(0x06144a) },
        uColorGlow: { value: new Color(0x3478ff) },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vPos;
        void main() {
          vUv = uv;
          vPos = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uColorDeep;
        uniform vec3 uColorGlow;
        varying vec2 vUv;
        varying vec3 vPos;

        void main() {
          vec2 p = vUv - 0.5;
          float r = length(p) * 2.0;
          float angle = atan(p.y, p.x);
          float rings = sin(r * 28.0 - uTime * 0.9 + sin(angle * 5.0 + uTime * 0.28) * 0.75);
          float cross = sin((p.x * 18.0 + p.y * 9.0) - uTime * 0.7) * 0.5 + 0.5;
          float shimmer = smoothstep(0.54, 1.0, rings * 0.5 + 0.5) * 0.45 + cross * 0.12;
          float center = smoothstep(0.92, 0.08, r);
          float edgeFade = smoothstep(1.0, 0.62, r);
          vec3 color = mix(uColorDeep, uColorGlow, shimmer + center * 0.22);
          float alpha = (0.055 + shimmer * 0.13 + center * 0.05) * edgeFade;
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      side: DoubleSide,
    });
    this.animatedMaterials.push(material);
    return material;
  }

  private buildParticleGeometry(
    count: number,
    generator: () => { position: Vector3; size: number; alpha: number },
  ): { geometry: BufferGeometry; base: Float32Array } {
    const positions = new Float32Array(count * 3);
    const base = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const alphas = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const p = generator();
      positions[i * 3] = p.position.x;
      positions[i * 3 + 1] = p.position.y;
      positions[i * 3 + 2] = p.position.z;
      base[i * 3] = p.position.x;
      base[i * 3 + 1] = p.position.y;
      base[i * 3 + 2] = p.position.z;
      sizes[i] = p.size;
      alphas[i] = p.alpha;
    }

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    geometry.setAttribute('aSize', new Float32BufferAttribute(sizes, 1));
    geometry.setAttribute('aAlpha', new Float32BufferAttribute(alphas, 1));
    return { geometry, base };
  }

  private buildStarCurtain(): void {
    const layers = [
      { count: this.isMobile ? 700 : 1500, z: -18, spread: 36, size: 1.1, alpha: 0.48 },
      { count: this.isMobile ? 260 : 580, z: -8, spread: 18, size: 2.7, alpha: 0.76 },
      { count: this.isMobile ? 70 : 150, z: -4, spread: 12, size: 5.0, alpha: 0.72 },
    ];

    layers.forEach((layer) => {
      const { geometry, base } = this.buildParticleGeometry(layer.count, () => {
        const x = (Math.random() - 0.5) * layer.spread * 2.2;
        const y = (Math.random() - 0.5) * layer.spread * 0.78 + 1.15;
        const z = layer.z - Math.random() * 12;
        return {
          position: new Vector3(x, y, z),
          size: layer.size * (0.45 + Math.random() * 0.95),
          alpha: layer.alpha * (0.3 + Math.random() * 0.7),
        };
      });
      const points = new Points(
        geometry,
        this.makeParticleMaterial(new Color(0x1f55ff), this.isMobile ? 0.55 : 0.68, true),
      );
      this.scene.add(points);
      this.particleSystems.push({ points, base, kind: 'firefly', strength: layer.z < -12 ? 0.05 : 0.14 });
    });
  }

  private buildFloatingGlowOrbs(): void {
    const orbTexture = this.makeRadialTexture([
      [0, 'rgba(246,252,255,0.92)'],
      [0.08, 'rgba(140,194,255,0.78)'],
      [0.28, 'rgba(50,100,245,0.34)'],
      [0.66, 'rgba(12,42,190,0.12)'],
      [1, 'rgba(0,0,0,0)'],
    ]);

    const count = this.isMobile ? 46 : 105;
    for (let i = 0; i < count; i++) {
      const foreground = i % 9 === 0;
      const upper = i % 5 === 0;
      const orb = new Sprite(
        new SpriteMaterial({
          map: orbTexture,
          color: foreground ? 0x7db7ff : i % 4 === 0 ? 0x4b83ff : 0x245cff,
          opacity: foreground ? 0.34 : 0.16 + Math.random() * 0.22,
          transparent: true,
          blending: AdditiveBlending,
          depthWrite: false,
        }),
      );
      const x = (Math.random() - 0.5) * (foreground ? 9.6 : 12.8);
      const y = upper ? 2.8 + Math.random() * 2.0 : -0.8 + Math.random() * 4.7;
      const z = foreground ? -0.6 + Math.random() * 1.6 : -3.8 - Math.random() * 6.8;
      orb.position.set(x, y, z);
      const size = foreground ? 0.16 + Math.random() * 0.34 : 0.035 + Math.random() * 0.16;
      orb.scale.set(size, size, 1);
      orb.userData = {
        basePosition: orb.position.clone(),
        baseScale: orb.scale.clone(),
        baseOpacity: orb.material.opacity,
        phase: Math.random() * Math.PI * 2,
        foreground,
      };
      this.floatingGlowOrbs.push(orb);
      this.scene.add(orb);
    }
  }

  private buildDeepBlueMoon(): void {
    const moonGroup = new Group();
    moonGroup.position.set(this.isMobile ? 2.55 : 3.95, this.isMobile ? 3.76 : 4.05, -7.4);
    this.scene.add(moonGroup);

    const moon = new Mesh(
      new SphereGeometry(this.isMobile ? 0.34 : 0.42, 40, 32),
      new MeshBasicMaterial({ color: 0xabcfff, transparent: true, opacity: 0.76 }),
    );
    moonGroup.add(moon);

    const glowTexture = this.makeRadialTexture([
      [0, 'rgba(185,218,255,0.72)'],
      [0.16, 'rgba(74,132,255,0.54)'],
      [0.45, 'rgba(16,42,180,0.22)'],
      [1, 'rgba(0,0,0,0)'],
    ]);

    this.moonGlow = new Sprite(
      new SpriteMaterial({
        map: glowTexture,
        transparent: true,
        opacity: 0.22,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
    );
    this.moonGlow.scale.set(this.isMobile ? 4.3 : 5.9, this.isMobile ? 4.3 : 5.9, 1);
    moonGroup.add(this.moonGlow);
  }

  private buildMoonlightRays(): void {
    const rayTexture = this.makeHorizontalGlowTexture();
    const raySpecs = [
      { x: 0.8, y: 3.52, z: -6.2, w: 8.6, h: 0.58, opacity: 0.1, rot: -0.03 },
      { x: 1.7, y: 3.82, z: -6.4, w: 6.4, h: 0.36, opacity: 0.08, rot: 0.02 },
      { x: 0.1, y: 2.9, z: -5.8, w: 7.4, h: 0.42, opacity: 0.065, rot: 0.045 },
      { x: 2.35, y: 4.12, z: -6.7, w: 4.2, h: 0.28, opacity: 0.07, rot: -0.06 },
    ];

    raySpecs.forEach((spec, index) => {
      const ray = new Sprite(
        new SpriteMaterial({
          map: rayTexture,
          color: index % 2 === 0 ? 0x8dbaff : 0x4f83ff,
          opacity: spec.opacity,
          transparent: true,
          blending: AdditiveBlending,
          depthWrite: false,
        }),
      );
      ray.position.set(spec.x, spec.y, spec.z);
      ray.scale.set(this.isMobile ? spec.w * 0.72 : spec.w, spec.h, 1);
      ray.material.rotation = spec.rot;
      ray.userData = { baseOpacity: spec.opacity, phase: index * 1.7 };
      this.moonRaySprites.push(ray);
      this.scene.add(ray);
    });
  }

  private buildTreeSkeleton(): void {
    this.buildVineTrunk();
    this.buildTrunkVolume();
    this.buildTrunkContours();

    BRANCHES.forEach((points, index) => {
      const curve = new CatmullRomCurve3(points);
      const geometry = new TubeGeometry(curve, 60, index === 0 ? 0.032 : 0.018, 9, false);
      const material = new MeshBasicMaterial({
        color: index === 0 ? 0x0a258c : 0x214fe0,
        transparent: true,
        opacity: index === 0 ? 0.12 : 0.14,
        depthWrite: false,
      });
      this.treeGroup.add(new Mesh(geometry, material));
    });

    for (let i = 0; i < 52; i++) {
      const side = Math.random() > 0.5 ? 1 : -1;
      const baseY = 0.35 + Math.random() * 2.45;
      const baseX = (Math.random() - 0.5) * 0.46;
      const reach = 0.68 + Math.random() * 2.25;
      const curve = new CatmullRomCurve3([
        new Vector3(baseX, baseY, (Math.random() - 0.5) * 0.22),
        new Vector3(baseX + side * reach * 0.42, baseY + 0.26 + Math.random() * 0.42, (Math.random() - 0.5) * 0.62),
        new Vector3(baseX + side * reach, baseY + 0.55 + Math.random() * 0.82, (Math.random() - 0.5) * 1.05),
      ]);
      const twig = new Mesh(
        new TubeGeometry(curve, 18, 0.006 + Math.random() * 0.01, 5, false),
        new MeshBasicMaterial({
          color: Math.random() > 0.55 ? 0x255dff : 0x7aa4ff,
          transparent: true,
          opacity: 0.08 + Math.random() * 0.12,
          blending: AdditiveBlending,
          depthWrite: false,
        }),
      );
      this.treeGroup.add(twig);
    }
  }

  private buildVineTrunk(): void {
    const nodeTexture = this.makeRadialTexture([
      [0, 'rgba(230,246,255,0.88)'],
      [0.16, 'rgba(92,150,255,0.56)'],
      [0.42, 'rgba(25,64,220,0.18)'],
      [1, 'rgba(0,0,0,0)'],
    ]);

    const trunkBody = new Mesh(
      new CylinderGeometry(0.34, 0.54, 3.38, 36, 10, true),
      new MeshBasicMaterial({
        color: 0x07165d,
        transparent: true,
        opacity: 0.28,
        depthWrite: false,
      }),
    );
    trunkBody.position.set(0, -0.18, 0);
    this.treeGroup.add(trunkBody);

    const innerShade = new Mesh(
      new CylinderGeometry(0.24, 0.4, 3.18, 36, 8, true),
      new MeshBasicMaterial({
        color: 0x010720,
        transparent: true,
        opacity: 0.22,
        blending: MultiplyBlending,
        depthWrite: false,
      }),
    );
    innerShade.position.set(0, -0.16, -0.02);
    this.treeGroup.add(innerShade);

    const coreTexture = this.makeRadialTexture([
      [0, 'rgba(225,244,255,0.46)'],
      [0.2, 'rgba(82,135,255,0.26)'],
      [0.5, 'rgba(22,54,210,0.09)'],
      [1, 'rgba(0,0,0,0)'],
    ]);

    const coreGlow = new Sprite(
      new SpriteMaterial({
        map: coreTexture,
        color: 0x3d72ff,
        opacity: 0.16,
        transparent: true,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
    );
    coreGlow.position.set(0, -0.34, 0.03);
    coreGlow.scale.set(1.26, 3.25, 1);
    this.treeGroup.add(coreGlow);

    const structuralBranches = [
      { side: -1, y: 0.62, end: [-1.5, 1.86, 0.24], lift: 0.5, width: 0.038 },
      { side: 1, y: 0.68, end: [1.55, 1.9, 0.18], lift: 0.52, width: 0.038 },
      { side: -1, y: 0.92, end: [-2.15, 2.32, -0.12], lift: 0.58, width: 0.028 },
      { side: 1, y: 0.98, end: [2.2, 2.36, -0.08], lift: 0.58, width: 0.028 },
      { side: -1, y: 1.18, end: [-0.9, 2.85, 0.44], lift: 0.78, width: 0.024 },
      { side: 1, y: 1.16, end: [0.95, 2.88, 0.38], lift: 0.78, width: 0.024 },
    ];

    structuralBranches.forEach((branch, index) => {
      const curve = new CatmullRomCurve3([
        new Vector3(branch.side * 0.16, branch.y - 0.16, 0.24),
        new Vector3(branch.side * 0.38, branch.y + branch.lift * 0.35, 0.36),
        new Vector3(branch.end[0] * 0.66, branch.y + branch.lift, 0.18),
        new Vector3(branch.end[0], branch.end[1], branch.end[2]),
      ]);
      this.treeGroup.add(
        new Mesh(
          new TubeGeometry(curve, 72, branch.width, 9, false),
          new MeshBasicMaterial({
            color: index % 2 === 0 ? 0x7fabff : 0x3f74ff,
            transparent: true,
            opacity: index < 2 ? 0.32 : 0.22,
            blending: AdditiveBlending,
            depthWrite: false,
          }),
        ),
      );
    });

    for (let i = 0; i < 38; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const startY = 0.28 + Math.random() * 1.28;
      const endY = 1.78 + Math.random() * 1.34;
      const reach = 0.62 + Math.random() * 1.85;
      const depthSide = i % 4 < 2 ? 1 : -1;
      const curve = new CatmullRomCurve3([
        new Vector3(side * (0.1 + Math.random() * 0.22), startY, depthSide * (0.22 + Math.random() * 0.28)),
        new Vector3(side * reach * 0.28, (startY + endY) * 0.5, depthSide * (0.42 + Math.random() * 0.44)),
        new Vector3(side * reach, endY, depthSide * (0.58 + Math.random() * 0.82)),
      ]);
      this.treeGroup.add(
        new Mesh(
          new TubeGeometry(curve, 38, 0.008 + Math.random() * 0.012, 6, false),
          new MeshBasicMaterial({
            color: i % 8 === 0 ? 0x9fc4ff : 0x2d63ff,
            transparent: true,
            opacity: i % 8 === 0 ? 0.28 : 0.13,
            blending: AdditiveBlending,
            depthWrite: false,
          }),
        ),
      );
    }

    for (let i = 0; i < 28; i++) {
      const depthSide = i % 2 === 0 ? -1 : 1;
      const side = i % 4 < 2 ? -1 : 1;
      const startY = 0.55 + Math.random() * 1.2;
      const endY = 1.95 + Math.random() * 1.05;
      const curve = new CatmullRomCurve3([
        new Vector3(side * 0.08, startY, depthSide * 0.2),
        new Vector3(side * (0.34 + Math.random() * 0.28), startY + 0.58, depthSide * (0.72 + Math.random() * 0.32)),
        new Vector3(side * (0.72 + Math.random() * 0.88), endY, depthSide * (1.0 + Math.random() * 0.45)),
      ]);
      this.treeGroup.add(
        new Mesh(
          new TubeGeometry(curve, 38, 0.007 + Math.random() * 0.01, 6, false),
          new MeshBasicMaterial({
            color: i % 7 === 0 ? 0x8fbaff : 0x2558e8,
            transparent: true,
            opacity: i % 7 === 0 ? 0.24 : 0.11,
            blending: AdditiveBlending,
            depthWrite: false,
          }),
        ),
      );
    }

    const trunkCurves: CatmullRomCurve3[] = [];
    const mainOffsets = [-0.42, -0.28, -0.14, 0, 0.14, 0.28, 0.42];
    mainOffsets.forEach((offset, i) => {
      const points: Vector3[] = [];
      for (let s = 0; s <= 8; s++) {
        const t = s / 8;
        const y = this.waterY + 0.03 + t * 2.76;
        const waist = Math.sin(t * Math.PI);
        points.push(
          new Vector3(
            offset * (1 - t * 0.46) + Math.sin(t * Math.PI * 2.4 + i) * 0.052,
            y,
            (i % 3 - 1) * 0.18 + Math.cos(t * Math.PI * 2 + i) * 0.08 * waist,
          ),
        );
      }
      trunkCurves.push(new CatmullRomCurve3(points));
    });

    for (let i = 0; i < (this.isMobile ? 16 : 28); i++) {
      const phase = (i / 28) * Math.PI * 2;
      const side = i % 2 === 0 ? 1 : -1;
      const points: Vector3[] = [];

      for (let s = 0; s <= 9; s++) {
        const t = s / 9;
        const y = this.waterY + 0.03 + t * (2.72 + Math.sin(phase) * 0.16);
        const trunkWidth = 0.56 * (1 - t * 0.52) + 0.15;
        const weave = Math.sin(t * Math.PI * (2.2 + (i % 4) * 0.28) + phase) * trunkWidth;
        const cross = Math.cos(t * Math.PI * 1.6 + phase * 0.8) * 0.16;
        const frontBack = Math.sin(t * Math.PI * 2.1 + phase) * 0.42;
        points.push(new Vector3(side * 0.08 + weave + cross * side, y, frontBack));
      }

      const curve = new CatmullRomCurve3(points);
      trunkCurves.push(curve);
    }

    trunkCurves.forEach((curve, i) => {
      const isMain = i < mainOffsets.length;
      const baseRadius = isMain ? 0.02 + (i % 2) * 0.008 : 0.008 + Math.random() * 0.012;
      this.treeGroup.add(
        new Mesh(
          new TubeGeometry(curve, isMain ? 86 : 70, baseRadius, 8, false),
          new MeshBasicMaterial({
            color: isMain ? (i % 2 === 0 ? 0x86b4ff : 0x2f66ff) : i % 5 === 0 ? 0x9dc5ff : i % 3 === 0 ? 0x4d7cff : 0x173ed2,
            transparent: true,
            opacity: isMain ? 0.38 : i % 5 === 0 ? 0.24 : 0.15,
            blending: isMain || i % 5 === 0 ? AdditiveBlending : undefined,
            depthWrite: false,
          }),
        ),
      );

      if (i % 3 === 0 || isMain) {
        const p = curve.getPoint(0.28 + Math.random() * 0.48);
        const node = new Sprite(
          new SpriteMaterial({
            map: nodeTexture,
            color: 0x78a6ff,
            opacity: 0.16 + Math.random() * 0.16,
            transparent: true,
            blending: AdditiveBlending,
            depthWrite: false,
          }),
        );
        node.position.copy(p);
        const size = isMain ? 0.14 + Math.random() * 0.14 : 0.09 + Math.random() * 0.13;
        node.scale.set(size, size, 1);
        this.trunkGlowNodes.push(node);
        this.treeGroup.add(node);
      }
    });

    for (let i = 0; i < 9; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const startX = side * (0.16 + (i % 3) * 0.08);
      const endX = side * (0.62 + Math.random() * 0.46);
      const curve = new CatmullRomCurve3([
        new Vector3(startX, this.waterY + 0.06, 0.18 - i * 0.018),
        new Vector3(side * 0.34, this.waterY + 0.52 + Math.random() * 0.28, 0.34 + Math.random() * 0.16),
        new Vector3(-side * 0.18, 0.22 + Math.random() * 0.34, 0.12 + Math.random() * 0.12),
        new Vector3(endX, 1.28 + Math.random() * 0.34, -0.08 + Math.random() * 0.18),
      ]);
      this.treeGroup.add(
        new Mesh(
          new TubeGeometry(curve, 76, 0.026 + Math.random() * 0.018, 8, false),
          new MeshBasicMaterial({
            color: i % 3 === 0 ? 0xb2d3ff : 0x4f82ff,
            transparent: true,
            opacity: i % 3 === 0 ? 0.28 : 0.2,
            blending: AdditiveBlending,
            depthWrite: false,
          }),
        ),
      );
    }

    this.buildWaterlineVines();
  }

  private buildWaterlineVines(): void {
    const contactMaterial = new MeshBasicMaterial({
      color: 0x7eb8ff,
      transparent: true,
      opacity: 0.18,
      blending: AdditiveBlending,
      depthWrite: false,
      side: DoubleSide,
    });

    for (let i = 0; i < 5; i++) {
      const contactRing = new Mesh(
        new RingGeometry(0.36 + i * 0.18, 0.374 + i * 0.18, 120),
        contactMaterial.clone(),
      );
      contactRing.rotation.x = -Math.PI / 2;
      contactRing.position.set(0, this.waterY + 0.038 + i * 0.004, 0);
      contactRing.scale.set(1.12 + i * 0.03, 0.82 + i * 0.055, 1);
      contactRing.renderOrder = 99;
      contactRing.userData = {
        basePosition: contactRing.position.clone(),
        baseScale: contactRing.scale.clone(),
        baseOpacity: 0.16 - i * 0.018,
        phase: i * 0.9,
      };
      this.waterRipples.push(contactRing);
      this.treeGroup.add(contactRing);
    }

    for (let i = 0; i < (this.isMobile ? 12 : 22); i++) {
      const phase = (i / 22) * Math.PI * 2;
      const radius = 0.3 + Math.random() * 0.24;
      const curve = new CatmullRomCurve3([
        new Vector3(Math.cos(phase) * radius, this.waterY + 0.035, Math.sin(phase) * radius),
        new Vector3(Math.cos(phase + 0.38) * (radius * 0.7), this.waterY + 0.34 + Math.random() * 0.24, Math.sin(phase + 0.38) * (radius * 0.7)),
        new Vector3(Math.cos(phase + 0.86) * (0.18 + Math.random() * 0.18), this.waterY + 0.92 + Math.random() * 0.46, Math.sin(phase + 0.86) * (0.18 + Math.random() * 0.2)),
      ]);
      this.treeGroup.add(
        new Mesh(
          new TubeGeometry(curve, 46, 0.008 + Math.random() * 0.012, 6, false),
          new MeshBasicMaterial({
            color: i % 5 === 0 ? 0x9fc7ff : 0x315fff,
            transparent: true,
            opacity: i % 5 === 0 ? 0.2 : 0.1,
            blending: AdditiveBlending,
            depthWrite: false,
          }),
        ),
      );
    }

    const contactTexture = this.makeRadialTexture([
      [0, 'rgba(245,252,255,0.9)'],
      [0.16, 'rgba(112,174,255,0.58)'],
      [0.48, 'rgba(32,82,235,0.18)'],
      [1, 'rgba(0,0,0,0)'],
    ]);

    for (let i = 0; i < (this.isMobile ? 18 : 34); i++) {
      const phase = (i / 34) * Math.PI * 2;
      const radius = 0.24 + Math.random() * 0.44;
      const spark = new Sprite(
        new SpriteMaterial({
          map: contactTexture,
          color: i % 6 === 0 ? 0xd8f0ff : 0x6ca6ff,
          opacity: i % 6 === 0 ? 0.22 : 0.12,
          transparent: true,
          blending: AdditiveBlending,
          depthWrite: false,
        }),
      );
      spark.position.set(
        Math.cos(phase) * radius,
        this.waterY + 0.06 + Math.random() * 0.18,
        Math.sin(phase) * radius,
      );
      const s = i % 6 === 0 ? 0.11 + Math.random() * 0.08 : 0.06 + Math.random() * 0.07;
      spark.scale.set(s, s, 1);
      this.trunkGlowNodes.push(spark);
      this.treeGroup.add(spark);
    }

    for (let i = 0; i < (this.isMobile ? 10 : 22); i++) {
      const phase = (i / 22) * Math.PI * 2;
      const height = 1.08 + Math.random() * 0.78;
      const curvePoints: Vector3[] = [];
      for (let s = 0; s <= 7; s++) {
        const t = s / 7;
        const twist = phase + t * Math.PI * (1.4 + (i % 4) * 0.22);
        const radius = 0.48 * (1 - t * 0.58) + 0.08;
        curvePoints.push(
          new Vector3(
            Math.cos(twist) * radius,
            this.waterY + 0.04 + t * height,
            Math.sin(twist) * radius * 0.82,
          ),
        );
      }
      const vine = new Mesh(
        new TubeGeometry(new CatmullRomCurve3(curvePoints), 56, i % 5 === 0 ? 0.018 : 0.009, 6, false),
        new MeshBasicMaterial({
          color: i % 5 === 0 ? 0xa9d1ff : i % 2 === 0 ? 0x4c83ff : 0x173ed6,
          transparent: true,
          opacity: i % 5 === 0 ? 0.24 : 0.13,
          blending: i % 5 === 0 ? AdditiveBlending : undefined,
          depthWrite: false,
        }),
      );
      this.treeGroup.add(vine);
    }
  }

  private buildTrunkVolume(): void {
    const count = this.isMobile ? 900 : 1900;
    const { geometry, base } = this.buildParticleGeometry(count, () => {
      const yNorm = Math.random();
      const y = this.waterY - 0.02 + yNorm * 2.82;
      const taper = 1 - yNorm * 0.46;
      const radiusX = 0.5 * taper + 0.14;
      const radiusZ = 0.38 * taper + 0.14;
      const angle = Math.random() * Math.PI * 2;
      const shell = Math.pow(Math.random(), 0.38);
      const x = Math.cos(angle) * radiusX * shell + Math.sin(yNorm * Math.PI * 5.2) * 0.05;
      const z = Math.sin(angle) * radiusZ * shell;
      const core = shell < 0.45;
      return {
        position: new Vector3(x, y, z),
        size: core ? 0.7 + Math.random() * 1.2 : 0.42 + Math.random() * 0.85,
        alpha: core ? 0.07 + Math.random() * 0.12 : 0.035 + Math.random() * 0.085,
      };
    });
    const points = new Points(
      geometry,
      this.makeParticleMaterial(new Color(0x4d7fff), this.isMobile ? 0.34 : 0.42, true),
    );
    this.treeGroup.add(points);
    this.particleSystems.push({ points, base, kind: 'trunkVolume', strength: 0.052 });
  }

  private buildTrunkContours(): void {
    const ringMaterial = new LineBasicMaterial({
      color: 0x5f8fff,
      transparent: true,
      opacity: 0.16,
      blending: AdditiveBlending,
      depthWrite: false,
    });

    for (let i = 0; i < 16; i++) {
      const yNorm = i / 15;
      const y = this.waterY + 0.02 + yNorm * 2.62;
      const taper = 1 - yNorm * 0.48;
      const rx = 0.46 * taper + 0.12;
      const rz = 0.32 * taper + 0.1;
      const points: Vector3[] = [];
      for (let s = 0; s <= 96; s++) {
        const a = (s / 96) * Math.PI * 2;
        const warp = 1 + Math.sin(a * 3 + yNorm * 8) * 0.08;
        points.push(new Vector3(Math.cos(a) * rx * warp, y, Math.sin(a) * rz));
      }
      const ring = new Line(new BufferGeometry().setFromPoints(points), ringMaterial.clone());
      ring.rotation.y = Math.sin(yNorm * Math.PI * 2) * 0.16;
      this.treeGroup.add(ring);
    }

    const rootDiscMaterial = new LineBasicMaterial({
      color: 0x7fb1ff,
      transparent: true,
      opacity: 0.012,
      blending: AdditiveBlending,
      depthWrite: false,
    });
    for (let i = 0; i < 4; i++) {
      const points: Vector3[] = [];
      const rx = 0.44 + i * 0.18;
      const rz = 0.28 + i * 0.1;
      for (let s = 0; s <= 96; s++) {
        const a = (s / 96) * Math.PI * 2;
        points.push(new Vector3(Math.cos(a) * rx, this.waterY - 0.028 + i * 0.003, Math.sin(a) * rz));
      }
      this.treeGroup.add(new Line(new BufferGeometry().setFromPoints(points), rootDiscMaterial.clone()));
    }
  }

  private buildCanopyVolumeCore(): void {
    CROWN_LOBES.forEach((lobe, index) => {
      const core = new Mesh(
        new SphereGeometry(1, 28, 18),
        new MeshBasicMaterial({
          color: index % 3 === 0 ? 0x06124f : index % 3 === 1 ? 0x071c72 : 0x0a2a92,
          transparent: true,
          opacity: index < 6 ? 0.18 : 0.11,
          depthWrite: false,
        }),
      );
      core.position.set(lobe.cx, lobe.cy, lobe.cz);
      core.scale.set(lobe.rx * 0.82, lobe.ry * 0.72, lobe.rz * 0.82);
      core.userData = { baseScale: core.scale.clone() };
      core.rotation.set(
        (Math.random() - 0.5) * 0.2,
        (index / CROWN_LOBES.length) * Math.PI * 2,
        (Math.random() - 0.5) * 0.18,
      );
      this.canopyVolumeMeshes.push(core);
      this.treeGroup.add(core);
    });

    const innerVoidTexture = this.makeRadialTexture([
      [0, 'rgba(2,8,42,0.34)'],
      [0.46, 'rgba(3,16,72,0.18)'],
      [1, 'rgba(0,0,0,0)'],
    ]);
    for (let i = 0; i < (this.isMobile ? 18 : 34); i++) {
      const lobe = CROWN_LOBES[Math.floor(Math.random() * CROWN_LOBES.length)];
      const patch = new Sprite(
        new SpriteMaterial({
          map: innerVoidTexture,
          color: 0x020b36,
          opacity: 0.18 + Math.random() * 0.12,
          transparent: true,
          depthWrite: false,
        }),
      );
      patch.position.set(
        lobe.cx + (Math.random() - 0.5) * lobe.rx * 0.72,
        lobe.cy + (Math.random() - 0.5) * lobe.ry * 0.52,
        lobe.cz + (Math.random() - 0.5) * lobe.rz * 0.72,
      );
      const s = 0.42 + Math.random() * 0.72;
      patch.scale.set(s * 1.45, s, 1);
      this.treeGroup.add(patch);
    }
  }

  private buildLeafCanopy(): void {
    const texture = this.makeLeafClusterTexture();
    const materialColors = [0x06104c, 0x0d2596, 0x1642df, 0x2e61ff, 0x071a72, 0x5a86ff, 0x9bc1ff];
    const count = this.isMobile ? 920 : 1840;

    for (let i = 0; i < count; i++) {
      const lobe = CROWN_LOBES[Math.floor(Math.random() * CROWN_LOBES.length)];
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const shell = 0.34 + Math.random() * 0.72;
      const x = lobe.cx + lobe.rx * Math.sin(phi) * Math.cos(theta) * shell;
      const y = lobe.cy + lobe.ry * Math.cos(phi) * shell;
      const z = lobe.cz + lobe.rz * Math.sin(phi) * Math.sin(theta) * shell;
      const frontBias = z > 0.28 ? 0.1 : 0;
      const edge = Math.abs(x - lobe.cx) / lobe.rx + Math.abs(y - lobe.cy) / lobe.ry;
      const isHighlight = edge > 0.82 || i % 9 === 0;
      const isPinLight = i % 23 === 0;
      const baseOpacity = (0.23 + frontBias) + Math.random() * (isHighlight ? 0.34 : 0.22);
      const sprite = new Sprite(
        new SpriteMaterial({
          map: texture,
          color: isPinLight ? 0xb2d2ff : isHighlight ? materialColors[(i + 3) % materialColors.length] : materialColors[i % 5],
          opacity: isPinLight ? Math.min(0.66, baseOpacity + 0.16) : baseOpacity,
          transparent: true,
          blending: isPinLight ? AdditiveBlending : undefined,
          depthWrite: false,
        }),
      ) as LeafSprite;
      sprite.position.set(x, y, z);
      const s = 0.18 + Math.random() * (isHighlight ? 0.44 : 0.34);
      sprite.scale.set(s * (1.35 + Math.random() * 0.85), s, 1);
      sprite.userData = {
        baseOpacity: isPinLight ? Math.min(0.62, baseOpacity + 0.12) : baseOpacity,
        shimmer: isPinLight ? 0.12 : isHighlight ? 0.07 : 0.035,
        phase: Math.random() * Math.PI * 2,
      };
      this.leafSprites.push(sprite);
      this.treeGroup.add(sprite);
    }

    for (let i = 0; i < (this.isMobile ? 180 : 380); i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const x = side * (1.15 + Math.random() * 1.62);
      const y = 2.0 + Math.random() * 1.18;
      const z = (i % 4 < 2 ? 1 : -1) * (0.22 + Math.random() * 1.12);
      const bright = i % 7 === 0;
      const baseOpacity = 0.22 + Math.random() * (bright ? 0.32 : 0.22);
      const sprite = new Sprite(
        new SpriteMaterial({
          map: texture,
          color: bright ? 0x95bcff : i % 5 === 0 ? 0x5f8fff : 0x1237c8,
          opacity: baseOpacity,
          transparent: true,
          blending: bright ? AdditiveBlending : undefined,
          depthWrite: false,
        }),
      ) as LeafSprite;
      sprite.position.set(x, y, z);
      const s = 0.2 + Math.random() * 0.42;
      sprite.scale.set(s * (1.45 + Math.random() * 0.72), s, 1);
      sprite.userData = {
        baseOpacity,
        shimmer: bright ? 0.1 : 0.045,
        phase: Math.random() * Math.PI * 2,
      };
      this.leafSprites.push(sprite);
      this.treeGroup.add(sprite);
    }
  }

  private buildDimensionalLeafShell(): void {
    const texture = this.makeSingleLeafTexture();
    const geometry = new PlaneGeometry(1, 0.42);
    const colors = [0x05114f, 0x0b2aa5, 0x1b50e8, 0x4f86ff, 0x98c4ff];
    const count = this.isMobile ? 260 : 620;

    for (let i = 0; i < count; i++) {
      const lobe = CROWN_LOBES[Math.floor(Math.random() * CROWN_LOBES.length)];
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const shell = 0.58 + Math.random() * 0.42;
      const p = new Vector3(
        lobe.cx + lobe.rx * Math.sin(phi) * Math.cos(theta) * shell,
        lobe.cy + lobe.ry * Math.cos(phi) * shell,
        lobe.cz + lobe.rz * Math.sin(phi) * Math.sin(theta) * shell,
      );
      const edge = shell > 0.84 || i % 6 === 0;
      const highlight = i % 13 === 0;
      const material = new MeshBasicMaterial({
        map: texture,
        color: highlight ? 0xc5e0ff : edge ? colors[(i + 2) % colors.length] : colors[i % 3],
        transparent: true,
        opacity: highlight ? 0.52 : edge ? 0.36 + Math.random() * 0.2 : 0.18 + Math.random() * 0.18,
        blending: highlight || edge ? AdditiveBlending : undefined,
        depthWrite: false,
        side: DoubleSide,
      });
      const leaf = new Mesh(geometry, material);
      leaf.position.copy(p);
      leaf.rotation.set(
        Math.sin(theta) * 0.85 + (Math.random() - 0.5) * 0.8,
        theta + Math.PI / 2 + (Math.random() - 0.5) * 0.9,
        (Math.random() - 0.5) * Math.PI,
      );
      const s = highlight ? 0.22 + Math.random() * 0.22 : 0.14 + Math.random() * 0.26;
      leaf.scale.set(s * (1.25 + Math.random() * 0.8), s, 1);
      leaf.userData = {
        baseOpacity: material.opacity,
        shimmer: highlight ? 0.11 : edge ? 0.055 : 0.028,
        phase: Math.random() * Math.PI * 2,
      };
      this.leafMeshes.push(leaf);
      this.treeGroup.add(leaf);
    }
  }

  private buildSilverLeafDepthLayer(): void {
    const leafTexture = this.makeSingleLeafTexture();
    const clusterTexture = this.makeLeafClusterTexture();
    const singleGeometry = new PlaneGeometry(1, 0.42);
    const clusterGeometry = new PlaneGeometry(1, 0.62);
    const count = this.isMobile ? 220 : 520;

    for (let i = 0; i < count; i++) {
      const lobe = CROWN_LOBES[Math.floor(Math.random() * CROWN_LOBES.length)];
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const shell = 0.66 + Math.random() * 0.42;
      const isCluster = i % 4 === 0;
      const highlight = i % 9 === 0 || (Math.sin(theta * 2.0) > 0.78 && i % 3 === 0);
      const p = new Vector3(
        lobe.cx + lobe.rx * Math.sin(phi) * Math.cos(theta) * shell,
        lobe.cy + lobe.ry * Math.cos(phi) * shell + (highlight ? 0.04 : 0),
        lobe.cz + lobe.rz * Math.sin(phi) * Math.sin(theta) * shell,
      );

      const material = new MeshBasicMaterial({
        map: isCluster ? clusterTexture : leafTexture,
        color: highlight ? 0xd7ecff : i % 5 === 0 ? 0x8dbbff : i % 3 === 0 ? 0x326cff : 0x0c2a9e,
        transparent: true,
        opacity: highlight ? 0.42 + Math.random() * 0.18 : 0.14 + Math.random() * 0.2,
        blending: highlight || i % 5 === 0 ? AdditiveBlending : undefined,
        depthWrite: false,
        side: DoubleSide,
      });

      const leaf = new Mesh(isCluster ? clusterGeometry : singleGeometry, material);
      leaf.position.copy(p);
      leaf.rotation.set(
        Math.sin(theta * 1.3) * 0.9 + (Math.random() - 0.5) * 0.55,
        theta + Math.PI / 2 + (Math.random() - 0.5) * 1.15,
        (Math.random() - 0.5) * Math.PI,
      );
      const s = isCluster ? 0.28 + Math.random() * 0.32 : 0.13 + Math.random() * 0.22;
      leaf.scale.set(s * (highlight ? 2.05 : 1.45 + Math.random() * 0.75), s, 1);
      leaf.userData = {
        baseOpacity: material.opacity,
        shimmer: highlight ? 0.12 : 0.04 + Math.random() * 0.03,
        phase: Math.random() * Math.PI * 2,
      };
      this.leafMeshes.push(leaf);
      this.treeGroup.add(leaf);
    }
  }

  private buildCanopyRimLights(): void {
    const rimTexture = this.makeRadialTexture([
      [0, 'rgba(245,252,255,0.58)'],
      [0.18, 'rgba(124,178,255,0.42)'],
      [0.52, 'rgba(38,86,230,0.16)'],
      [1, 'rgba(0,0,0,0)'],
    ]);
    const count = this.isMobile ? 42 : 92;

    for (let i = 0; i < count; i++) {
      const lobe = CROWN_LOBES[i % CROWN_LOBES.length];
      const theta = (i / count) * Math.PI * 2 + Math.random() * 0.34;
      const upperBias = i % 5 === 0 ? 0.32 : 0;
      const p = new Vector3(
        lobe.cx + Math.cos(theta) * lobe.rx * (0.86 + Math.random() * 0.22),
        lobe.cy + (Math.random() - 0.34) * lobe.ry * 0.95 + upperBias,
        lobe.cz + Math.sin(theta) * lobe.rz * (0.86 + Math.random() * 0.2),
      );
      const rim = new Sprite(
        new SpriteMaterial({
          map: rimTexture,
          color: i % 7 === 0 ? 0xd9efff : i % 3 === 0 ? 0x83b5ff : 0x3f7bff,
          opacity: i % 7 === 0 ? 0.2 : 0.11,
          transparent: true,
          blending: AdditiveBlending,
          depthWrite: false,
        }),
      );
      rim.position.copy(p);
      const s = i % 7 === 0 ? 0.3 + Math.random() * 0.28 : 0.18 + Math.random() * 0.24;
      rim.scale.set(s * (1.8 + Math.random() * 1.4), s * (0.62 + Math.random() * 0.42), 1);
      rim.userData = {
        baseOpacity: rim.material.opacity,
        phase: Math.random() * Math.PI * 2,
      };
      this.canopyRimSprites.push(rim);
      this.treeGroup.add(rim);
    }
  }

  private buildCanopyBranchLattice(): void {
    const branchMaterials = [
      new MeshBasicMaterial({
        color: 0x89b6ff,
        transparent: true,
        opacity: 0.2,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
      new MeshBasicMaterial({
        color: 0x2a5dff,
        transparent: true,
        opacity: 0.115,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
      new MeshBasicMaterial({
        color: 0x071b82,
        transparent: true,
        opacity: 0.16,
        depthWrite: false,
      }),
    ];

    const count = this.isMobile ? 46 : 92;
    for (let i = 0; i < count; i++) {
      const lobe = CROWN_LOBES[i % CROWN_LOBES.length];
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.42;
      const startY = 0.42 + Math.random() * 1.35;
      const reach = 0.44 + Math.random() * 0.42;
      const endShell = 0.58 + Math.random() * 0.36;
      const end = new Vector3(
        lobe.cx + Math.cos(angle) * lobe.rx * endShell,
        lobe.cy + (Math.random() - 0.5) * lobe.ry * 1.08,
        lobe.cz + Math.sin(angle) * lobe.rz * endShell,
      );
      const mid = new Vector3(
        Math.cos(angle) * (0.38 + Math.random() * 0.62),
        (startY + end.y) * 0.52,
        Math.sin(angle) * (0.38 + Math.random() * 0.72),
      );
      const curve = new CatmullRomCurve3([
        new Vector3(Math.cos(angle) * 0.18, startY, Math.sin(angle) * 0.18),
        mid,
        new Vector3(end.x * reach, end.y - 0.18, end.z * reach),
        end,
      ]);
      const branch = new Mesh(
        new TubeGeometry(curve, 38, i % 11 === 0 ? 0.014 : 0.006 + Math.random() * 0.008, 5, false),
        branchMaterials[i % branchMaterials.length].clone(),
      );
      this.treeGroup.add(branch);

      if (i % 3 === 0) {
        for (let j = 0; j < 2; j++) {
          const t = 0.52 + Math.random() * 0.34;
          const anchor = curve.getPoint(t);
          const twigAngle = angle + (j === 0 ? 1 : -1) * (0.42 + Math.random() * 0.55);
          const twigEnd = new Vector3(
            anchor.x + Math.cos(twigAngle) * (0.28 + Math.random() * 0.5),
            anchor.y + 0.08 + Math.random() * 0.34,
            anchor.z + Math.sin(twigAngle) * (0.28 + Math.random() * 0.5),
          );
          const twig = new Mesh(
            new TubeGeometry(new CatmullRomCurve3([anchor, anchor.clone().lerp(twigEnd, 0.52), twigEnd]), 18, 0.0035, 4, false),
            branchMaterials[(i + j + 1) % branchMaterials.length].clone(),
          );
          this.treeGroup.add(twig);
        }
      }
    }
  }

  private buildCrownSparkles(): void {
    const sparkleTexture = this.makeRadialTexture([
      [0, 'rgba(255,255,255,0.98)'],
      [0.08, 'rgba(185,225,255,0.76)'],
      [0.24, 'rgba(78,136,255,0.34)'],
      [0.54, 'rgba(22,54,210,0.12)'],
      [1, 'rgba(0,0,0,0)'],
    ]);
    const count = this.isMobile ? 150 : 340;

    for (let i = 0; i < count; i++) {
      const lobe = CROWN_LOBES[Math.floor(Math.random() * CROWN_LOBES.length)];
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const shell = 0.46 + Math.random() * 0.58;
      const p = new Vector3(
        lobe.cx + lobe.rx * Math.sin(phi) * Math.cos(theta) * shell,
        lobe.cy + lobe.ry * Math.cos(phi) * shell,
        lobe.cz + lobe.rz * Math.sin(phi) * Math.sin(theta) * shell,
      );
      const sprite = new Sprite(
        new SpriteMaterial({
          map: sparkleTexture,
          color: i % 8 === 0 ? 0xf2fbff : i % 4 === 0 ? 0xa8ccff : 0x4678ff,
          opacity: i % 8 === 0 ? 0.28 + Math.random() * 0.18 : 0.075 + Math.random() * 0.17,
          transparent: true,
          blending: AdditiveBlending,
          depthWrite: false,
        }),
      );
      sprite.position.copy(p);
      const s = i % 8 === 0 ? 0.05 + Math.random() * 0.14 : 0.026 + Math.random() * 0.085;
      sprite.scale.set(s, s, 1);
      this.crownSparkles.push(sprite);
      this.treeGroup.add(sprite);

      if (i % 11 === 0) {
        const halo = new Sprite(
          new SpriteMaterial({
            map: sparkleTexture,
            color: i % 22 === 0 ? 0xcde8ff : 0x4f86ff,
            opacity: 0.08 + Math.random() * 0.08,
            transparent: true,
            blending: AdditiveBlending,
            depthWrite: false,
          }),
        );
        halo.position.copy(p);
        halo.scale.set(s * 5.2, s * 3.6, 1);
        this.crownSparkles.push(halo);
        this.treeGroup.add(halo);
      }
    }
  }

  private buildCanopyGlowPatches(): void {
    const patchTexture = this.makeRadialTexture([
      [0, 'rgba(170,210,255,0.42)'],
      [0.22, 'rgba(66,120,255,0.28)'],
      [0.58, 'rgba(18,52,210,0.08)'],
      [1, 'rgba(0,0,0,0)'],
    ]);
    const patches = [
      [-1.25, 3.12, 0.72, 0.9, 0.48],
      [1.22, 3.08, 0.62, 0.86, 0.44],
      [-0.1, 3.42, 0.84, 1.05, 0.36],
      [-2.05, 2.66, 0.56, 0.74, 0.34],
      [2.0, 2.62, 0.5, 0.72, 0.34],
      [0.35, 2.62, 0.92, 0.9, 0.4],
      [-0.85, 2.38, 1.02, 0.78, 0.32],
    ];

    patches.forEach((patch, index) => {
      const sprite = new Sprite(
        new SpriteMaterial({
          map: patchTexture,
          color: index % 3 === 0 ? 0x8db9ff : 0x356dff,
          opacity: patch[4],
          transparent: true,
          blending: AdditiveBlending,
          depthWrite: false,
        }),
      );
      sprite.position.set(patch[0], patch[1], patch[2]);
      sprite.scale.set(patch[3] * 1.45, patch[3], 1);
      this.canopyGlowPatches.push(sprite);
      this.treeGroup.add(sprite);
    });
  }

  private buildTreeParticles(): void {
    BRANCHES.forEach((points, index) => {
      const curve = new CatmullRomCurve3(points);
      const count = this.isMobile ? (index === 0 ? 140 : 60) : index === 0 ? 260 : 100;
      const { geometry, base } = this.buildParticleGeometry(count, () => {
        const t = Math.random();
        const p = curve.getPoint(t);
        const spread = (index === 0 ? 0.08 : 0.045) + t * 0.08;
        p.x += (Math.random() - 0.5) * spread;
        p.y += (Math.random() - 0.5) * spread;
        p.z += (Math.random() - 0.5) * spread;
        return {
          position: p,
          size: 0.22 + Math.random() * 0.5,
          alpha: 0.04 + Math.random() * 0.1,
        };
      });
      const pointsObj = new Points(
        geometry,
        this.makeParticleMaterial(new Color(index === 0 ? 0x1237c8 : 0x3564ff), 0.24, true),
      );
      this.treeGroup.add(pointsObj);
      this.particleSystems.push({ points: pointsObj, base, kind: 'trunk', strength: 0.035 });
    });

    CROWN_LOBES.forEach((lobe, index) => {
      const count = Math.floor((this.isMobile ? lobe.count * 0.1 : lobe.count * 0.18) as number);
      const { geometry, base } = this.buildParticleGeometry(count, () => {
        const phi = Math.acos(2 * Math.random() - 1);
        const theta = Math.random() * Math.PI * 2;
        const shell = 0.58 + Math.random() * 0.56;
        const p = new Vector3(
          lobe.cx + lobe.rx * Math.sin(phi) * Math.cos(theta) * shell,
          lobe.cy + lobe.ry * Math.cos(phi) * shell,
          lobe.cz + lobe.rz * Math.sin(phi) * Math.sin(theta) * shell,
        );
        const edge = Math.random() > 0.72 ? 1.65 : 1;
        p.x += (Math.random() - 0.5) * 0.12 * edge;
        p.y += (Math.random() - 0.5) * 0.1 * edge;
        return {
          position: p,
          size: 0.34 + Math.random() * 0.92,
          alpha: 0.045 + Math.random() * 0.19,
        };
      });
      const color = index % 2 === 0 ? new Color(0x214fff) : new Color(0x5e88ff);
      const crown = new Points(geometry, this.makeParticleMaterial(color, this.isMobile ? 0.22 : 0.28, true));
      this.treeGroup.add(crown);
      this.particleSystems.push({ points: crown, base, kind: 'crown', strength: 0.22 });
    });

    const { geometry, base } = this.buildParticleGeometry(this.isMobile ? 120 : 260, () => {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * 4.2;
      return {
        position: new Vector3(Math.cos(angle) * r, -1.78 + Math.random() * 6.5, Math.sin(angle) * r * 0.55),
        size: 1.2 + Math.random() * 3.2,
        alpha: 0.1 + Math.random() * 0.24,
      };
    });
    const falling = new Points(geometry, this.makeParticleMaterial(new Color(0x4b87ff), 0.62, true));
    this.treeGroup.add(falling);
    this.particleSystems.push({ points: falling, base, kind: 'falling', strength: 0.1 });
  }

  private buildEnergyCore(): void {
    this.energyCore = new Sprite(
      new SpriteMaterial({
        map: this.makeRadialTexture([
          [0, 'rgba(150,190,255,0.18)'],
          [0.12, 'rgba(64,105,255,0.16)'],
          [0.28, 'rgba(28,62,220,0.09)'],
          [0.62, 'rgba(8,28,140,0.035)'],
          [1, 'rgba(0,0,0,0)'],
        ]),
        color: 0x4f84ff,
        opacity: 0.08,
        transparent: true,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
    );
    this.energyCore.position.set(0, 0.35, 0.28);
    this.energyCore.scale.set(this.isMobile ? 1.45 : 1.75, this.isMobile ? 1.45 : 1.75, 1);
    this.treeGroup.add(this.energyCore);

    const pool = new Mesh(
      new CircleGeometry(2.8, 96),
      new MeshBasicMaterial({
        color: 0x0d2d9a,
        side: DoubleSide,
        transparent: true,
        opacity: 0.045,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
    );
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(0, this.waterY + 0.024, 0);
    this.treeGroup.add(pool);
  }

  private buildButterflies(): void {
    const texture = this.makeButterflyTexture();
    const glowTexture = this.makeRadialTexture([
      [0, 'rgba(245,252,255,0.96)'],
      [0.1, 'rgba(142,190,255,0.62)'],
      [0.36, 'rgba(45,88,235,0.28)'],
      [1, 'rgba(0,0,0,0)'],
    ]);
    const coreTexture = this.makeRadialTexture([
      [0, 'rgba(255,255,255,1)'],
      [0.18, 'rgba(190,226,255,0.82)'],
      [0.5, 'rgba(66,118,255,0.24)'],
      [1, 'rgba(0,0,0,0)'],
    ]);
    const trailTexture = this.makeRadialTexture([
      [0, 'rgba(230,246,255,0.5)'],
      [0.16, 'rgba(92,158,255,0.32)'],
      [0.48, 'rgba(35,84,235,0.12)'],
      [1, 'rgba(0,0,0,0)'],
    ]);
    const specs: Array<{
      c: [number, number, number];
      rx: number;
      ry: number;
      s: number;
      speed: number;
      fg: boolean;
      path: 'sky' | 'canopy' | 'foreground';
      altitude: number;
      depth: number;
    }> = [
      { c: [0, 1.05, 0.9], rx: 4.8, ry: 1.1, s: 1.34, speed: 0.34, fg: true, path: 'foreground', altitude: 0.82, depth: 1.55 },
      { c: [0, 1.08, 0.82], rx: 4.95, ry: 1.18, s: 1.38, speed: -0.3, fg: true, path: 'foreground', altitude: 0.9, depth: 1.45 },
      { c: [0, 1.35, 0.7], rx: 4.25, ry: 1.45, s: 0.96, speed: 0.42, fg: true, path: 'sky', altitude: 1.35, depth: 1.2 },
      { c: [0, 1.42, 0.62], rx: 4.3, ry: 1.36, s: 0.9, speed: -0.39, fg: true, path: 'sky', altitude: 1.45, depth: 1.05 },
      { c: [0, 2.0, 0.38], rx: 3.65, ry: 1.28, s: 0.82, speed: 0.46, fg: false, path: 'canopy', altitude: 2.1, depth: 0.92 },
      { c: [0, 2.18, 0.32], rx: 3.35, ry: 1.04, s: 0.58, speed: -0.54, fg: false, path: 'canopy', altitude: 2.2, depth: 0.78 },
      { c: [0, 2.26, 0.26], rx: 3.45, ry: 0.96, s: 0.56, speed: 0.5, fg: false, path: 'canopy', altitude: 2.34, depth: 0.72 },
      { c: [0, 0.72, 1.38], rx: 3.15, ry: 0.64, s: 0.78, speed: 0.68, fg: true, path: 'foreground', altitude: 0.58, depth: 1.7 },
      { c: [0, 2.62, 0.1], rx: 4.7, ry: 0.82, s: 0.48, speed: -0.58, fg: false, path: 'sky', altitude: 2.72, depth: 0.55 },
      { c: [0, 2.72, 0.12], rx: 4.85, ry: 0.88, s: 0.5, speed: 0.56, fg: false, path: 'sky', altitude: 2.82, depth: 0.58 },
      { c: [0, 3.05, -0.08], rx: 3.1, ry: 0.72, s: 0.38, speed: -0.62, fg: false, path: 'canopy', altitude: 3.02, depth: 0.42 },
      { c: [0, 1.82, 0.78], rx: 5.35, ry: 1.36, s: 0.72, speed: 0.46, fg: true, path: 'sky', altitude: 1.86, depth: 1.25 },
      { c: [0, 1.78, 0.72], rx: 5.2, ry: 1.28, s: 0.7, speed: -0.44, fg: true, path: 'sky', altitude: 1.76, depth: 1.18 },
      { c: [0, 3.05, -0.16], rx: 4.2, ry: 0.58, s: 0.42, speed: 0.61, fg: false, path: 'sky', altitude: 3.08, depth: 0.35 },
      { c: [0, 3.0, -0.14], rx: 4.1, ry: 0.56, s: 0.42, speed: -0.59, fg: false, path: 'sky', altitude: 3.0, depth: 0.34 },
      { c: [0, 0.62, 1.52], rx: 2.9, ry: 0.52, s: 0.62, speed: 0.72, fg: true, path: 'foreground', altitude: 0.48, depth: 1.85 },
      { c: [0, 0.64, 1.46], rx: 3.0, ry: 0.5, s: 0.64, speed: -0.7, fg: true, path: 'foreground', altitude: 0.52, depth: 1.78 },
      { c: [0, 3.28, -0.16], rx: 2.7, ry: 0.44, s: 0.34, speed: 0.66, fg: false, path: 'canopy', altitude: 3.28, depth: 0.34 },
      { c: [0, 3.22, -0.18], rx: 2.75, ry: 0.46, s: 0.34, speed: -0.65, fg: false, path: 'canopy', altitude: 3.2, depth: 0.34 },
      { c: [0, 0.82, 1.3], rx: 4.0, ry: 0.76, s: 0.82, speed: 0.52, fg: true, path: 'foreground', altitude: 0.7, depth: 1.66 },
      { c: [0, 0.86, 1.24], rx: 4.08, ry: 0.74, s: 0.84, speed: -0.5, fg: true, path: 'foreground', altitude: 0.74, depth: 1.6 },
    ];

    for (let i = 0; i < (this.isMobile ? 18 : 46); i++) {
      const highSky = i % 3 === 0;
      const foreground = i % 7 === 0;
      const farHalo = i % 5 === 0 && !foreground;
      specs.push({
        c: [
          0,
          highSky ? 2.48 + Math.random() * 1.04 : 0.98 + Math.random() * 1.92,
          foreground ? 1.18 + Math.random() * 0.52 : farHalo ? -0.82 - Math.random() * 0.68 : -0.28 + Math.random() * 0.98,
        ],
        rx: foreground ? 4.45 + Math.random() * 1.32 : farHalo ? 5.2 + Math.random() * 1.45 : 3.85 + Math.random() * 1.85,
        ry: highSky ? 0.48 + Math.random() * 0.44 : 0.62 + Math.random() * 0.95,
        s: foreground ? 0.66 + Math.random() * 0.46 : farHalo ? 0.18 + Math.random() * 0.22 : 0.24 + Math.random() * 0.38,
        speed: (i % 2 === 0 ? 1 : -1) * (0.42 + Math.random() * 0.36),
        fg: foreground,
        path: foreground ? 'foreground' : highSky ? 'sky' : 'canopy',
        altitude: highSky ? 2.58 + Math.random() * 0.82 : foreground ? 0.56 + Math.random() * 0.58 : 1.42 + Math.random() * 1.28,
        depth: foreground ? 1.7 + Math.random() * 0.62 : farHalo ? 0.38 + Math.random() * 0.52 : 0.58 + Math.random() * 1.05,
      });
    }

    specs.forEach((spec, index) => {
      const sprite = new Sprite(
        new SpriteMaterial({
          map: texture,
          color: 0xb7ccff,
          opacity: spec.fg ? 0.78 : 0.58,
          transparent: true,
          depthWrite: false,
        }),
      );
      const glow = new Sprite(
        new SpriteMaterial({
          map: glowTexture,
          color: 0x3d6fff,
          opacity: spec.fg ? 0.56 : 0.34,
          transparent: true,
          blending: AdditiveBlending,
          depthWrite: false,
        }),
      );
      const core = new Sprite(
        new SpriteMaterial({
          map: coreTexture,
          color: 0xe8f7ff,
          opacity: spec.fg ? 0.6 : 0.36,
          transparent: true,
          blending: AdditiveBlending,
          depthWrite: false,
        }),
      );
      const trails: Sprite[] = [];
      const trailCount = spec.fg ? 4 : 3;
      for (let i = 0; i < trailCount; i++) {
        const trail = new Sprite(
          new SpriteMaterial({
            map: trailTexture,
            color: i === 0 ? 0xa7d0ff : 0x3f78ff,
            opacity: spec.fg ? 0.18 - i * 0.028 : 0.12 - i * 0.024,
            transparent: true,
            blending: AdditiveBlending,
            depthWrite: false,
          }),
        );
        trail.renderOrder = 9;
        trails.push(trail);
        this.treeGroup.add(trail);
      }
      this.treeGroup.add(sprite);
      this.treeGroup.add(glow);
      this.treeGroup.add(core);
      this.butterflies.push({
        sprite,
        glow,
        core,
        trails,
        center: new Vector3(spec.c[0], spec.c[1], spec.c[2]),
        radiusX: spec.rx,
        radiusY: spec.ry,
        scale: this.isMobile ? spec.s * 0.68 : spec.s,
        speed: spec.speed,
        phase: index * 1.4,
        foreground: spec.fg,
        path: spec.path as 'sky' | 'canopy' | 'foreground',
        altitude: spec.altitude,
        depth: spec.depth,
      });
    });
  }

  private buildWaterAndReflection(): void {
    this.waterGroup.position.y = 0;
    this.treeGroup.add(this.waterGroup);

    const waterBase = new Mesh(
      new CircleGeometry(4.9, 160),
      new MeshBasicMaterial({
        color: 0x020817,
        side: DoubleSide,
        depthWrite: true,
      }),
    );
    waterBase.rotation.x = -Math.PI / 2;
    waterBase.position.set(0, this.waterY - 0.035, 0);
    waterBase.scale.set(1.08, 1.08, 1);
    waterBase.renderOrder = 84;
    this.waterGroup.add(waterBase);

    const waterGlow = new Mesh(
      new CircleGeometry(4.75, 160),
      this.makeWaterGlowMaterial(),
    );
    waterGlow.rotation.x = -Math.PI / 2;
    waterGlow.position.set(0, this.waterY - 0.018, 0);
    waterGlow.renderOrder = 89;
    this.waterGroup.add(waterGlow);

    const rootMaskTexture = this.makeRadialTexture([
      [0, 'rgba(1,6,20,0.96)'],
      [0.42, 'rgba(2,10,32,0.88)'],
      [0.72, 'rgba(3,14,52,0.34)'],
      [1, 'rgba(0,0,0,0)'],
    ]);
    const rootMask = new Mesh(
      new CircleGeometry(1.38, 128),
      new MeshBasicMaterial({
        map: rootMaskTexture,
        color: 0x020916,
        side: DoubleSide,
        transparent: true,
        opacity: 0.92,
        depthWrite: false,
      }),
    );
    rootMask.rotation.x = -Math.PI / 2;
    rootMask.position.set(0, this.waterY + 0.066, 0);
    rootMask.scale.set(1.28, 0.82, 1);
    rootMask.renderOrder = 130;
    this.waterGroup.add(rootMask);

    const nearShoreGlow = new Mesh(
      new RingGeometry(0.52, 4.65, 160),
      new MeshBasicMaterial({
        color: 0x255cff,
        side: DoubleSide,
        transparent: true,
        opacity: 0.075,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
    );
    nearShoreGlow.rotation.x = -Math.PI / 2;
    nearShoreGlow.position.set(0, this.waterY - 0.008, 0);
    nearShoreGlow.scale.set(1.12, 1.12, 1);
    nearShoreGlow.renderOrder = 90;
    this.waterGroup.add(nearShoreGlow);

    const waterLine = new Mesh(
      new RingGeometry(4.78, 4.8, 192),
      new MeshBasicMaterial({
        color: 0x7fb2ff,
        side: DoubleSide,
        transparent: true,
        opacity: 0.2,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
    );
    waterLine.rotation.x = -Math.PI / 2;
    waterLine.position.set(0, this.waterY + 0.004, 0);
    waterLine.renderOrder = 94;
    this.waterGroup.add(waterLine);

    for (let i = 0; i < 8; i++) {
      const ring = new Mesh(
        new RingGeometry(0.42 + i * 0.44, 0.432 + i * 0.44, 128),
        new MeshBasicMaterial({
          color: i % 2 === 0 ? 0x4f8fff : 0x245dff,
          side: DoubleSide,
          transparent: true,
          opacity: 0.12 - i * 0.009,
          blending: AdditiveBlending,
          depthWrite: false,
        }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.scale.set(1 + i * 0.018, 1 + i * 0.018, 1);
      ring.position.set(0, this.waterY + 0.012 + i * 0.002, 0);
      ring.renderOrder = 95;
      this.waterRipples.push(ring);
      this.waterGroup.add(ring);
    }

    for (let i = 0; i < 6; i++) {
      const entryRipple = new Mesh(
        new RingGeometry(0.28 + i * 0.16, 0.292 + i * 0.16, 96),
        new MeshBasicMaterial({
          color: i % 2 === 0 ? 0xb9ddff : 0x4f85ff,
          side: DoubleSide,
          transparent: true,
          opacity: 0.22 - i * 0.024,
          blending: AdditiveBlending,
          depthWrite: false,
        }),
      );
      entryRipple.rotation.x = -Math.PI / 2;
      entryRipple.position.set(0, this.waterY + 0.025 + i * 0.003, 0);
      entryRipple.renderOrder = 97;
      this.waterRipples.push(entryRipple);
      this.waterGroup.add(entryRipple);
    }

    const reflectionTexture = this.makeRadialTexture([
      [0, 'rgba(112,165,255,0.34)'],
      [0.26, 'rgba(42,88,230,0.22)'],
      [0.62, 'rgba(5,24,120,0.09)'],
      [1, 'rgba(0,0,0,0)'],
    ]);
    const canopyReflection = new Sprite(
      new SpriteMaterial({
        map: reflectionTexture,
        color: 0x2c67ff,
        opacity: 0.24,
        transparent: true,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
    );
    canopyReflection.position.set(0, this.waterY + 0.018, 0.72);
    canopyReflection.scale.set(4.8, 0.86, 1);
    canopyReflection.userData = { baseOpacity: 0.11, shimmer: 0.022 };
    canopyReflection.renderOrder = 92;
    this.reflectionSprites.push(canopyReflection);
    this.waterGroup.add(canopyReflection);

    const leafReflectionTexture = this.makeLeafClusterTexture();
    for (let i = 0; i < (this.isMobile ? 80 : 170); i++) {
      const lobe = CROWN_LOBES[Math.floor(Math.random() * CROWN_LOBES.length)];
      const theta = Math.random() * Math.PI * 2;
      const shell = 0.35 + Math.random() * 0.62;
      const sourceX = lobe.cx + Math.cos(theta) * lobe.rx * shell;
      const sourceZ = lobe.cz + Math.sin(theta) * lobe.rz * shell;
      const baseOpacity = 0.035 + Math.random() * 0.065;
      const sprite = new Sprite(
        new SpriteMaterial({
          map: leafReflectionTexture,
          color: i % 6 === 0 ? 0x7fabff : 0x1f50d4,
          opacity: baseOpacity,
          transparent: true,
          blending: AdditiveBlending,
          depthWrite: false,
        }),
      );
      sprite.position.set(sourceX * 0.86, this.waterY + 0.028 + Math.random() * 0.012, sourceZ * 0.72 + 0.42);
      const s = 0.16 + Math.random() * 0.28;
      sprite.scale.set(s * 1.55, s * 0.32, 1);
      sprite.userData = { baseOpacity, shimmer: 0.018 + Math.random() * 0.018 };
      sprite.renderOrder = 92;
      this.reflectionSprites.push(sprite);
      this.waterGroup.add(sprite);
    }

    const flatLeafReflectionTexture = this.makeSingleLeafTexture();
    for (let i = 0; i < (this.isMobile ? 34 : 76); i++) {
      const lobe = CROWN_LOBES[Math.floor(Math.random() * CROWN_LOBES.length)];
      const theta = Math.random() * Math.PI * 2;
      const shell = 0.36 + Math.random() * 0.72;
      const reflectionLeaf = new Mesh(
        new PlaneGeometry(1, 0.34),
        new MeshBasicMaterial({
          map: flatLeafReflectionTexture,
          color: i % 7 === 0 ? 0x9dc8ff : 0x245de8,
          side: DoubleSide,
          transparent: true,
          opacity: i % 7 === 0 ? 0.12 : 0.065,
          blending: AdditiveBlending,
          depthWrite: false,
        }),
      );
      reflectionLeaf.rotation.x = -Math.PI / 2;
      reflectionLeaf.rotation.z = theta + (Math.random() - 0.5) * 0.9;
      reflectionLeaf.position.set(
        (lobe.cx + Math.cos(theta) * lobe.rx * shell) * 0.78,
        this.waterY + 0.044 + Math.random() * 0.014,
        (lobe.cz + Math.sin(theta) * lobe.rz * shell) * 0.6 + 0.35,
      );
      const s = 0.18 + Math.random() * 0.38;
      reflectionLeaf.scale.set(s * 1.8, s * 0.62, 1);
      reflectionLeaf.renderOrder = 97;
      this.waterRipples.push(reflectionLeaf);
      this.waterGroup.add(reflectionLeaf);
    }

    const longReflectionTexture = this.makeHorizontalGlowTexture();
    for (let i = 0; i < (this.isMobile ? 18 : 34); i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = i < 10 ? Math.random() * 0.95 : 0.55 + Math.random() * 3.35;
      const tangent = angle + Math.PI / 2 + (Math.random() - 0.5) * 0.38;
      const isBrightThread = i % 6 === 0;
      const reflectionStrip = new Mesh(
        new PlaneGeometry(1, 0.045 + Math.random() * 0.04),
        new MeshBasicMaterial({
          map: longReflectionTexture,
          color: isBrightThread ? 0xc9e8ff : 0x4c84ff,
          side: DoubleSide,
          transparent: true,
          opacity: isBrightThread ? 0.12 : 0.066,
          blending: AdditiveBlending,
          depthWrite: false,
        }),
      );
      reflectionStrip.rotation.x = -Math.PI / 2;
      reflectionStrip.rotation.z = tangent;
      reflectionStrip.position.set(
        Math.cos(angle) * radius,
        this.waterY + 0.052 + Math.random() * 0.014,
        Math.sin(angle) * radius + (i < 14 ? 0.22 : 0),
      );
      reflectionStrip.scale.set(1.15 + Math.random() * (i < 12 ? 3.1 : 2.15), 1, 1);
      reflectionStrip.userData = {
        baseOpacity: isBrightThread ? 0.095 : 0.052,
        phase: Math.random() * Math.PI * 2,
      };
      reflectionStrip.renderOrder = 98;
      this.waterRipples.push(reflectionStrip);
      this.waterGroup.add(reflectionStrip);
    }

    const trunkReflectionMaterial = new LineBasicMaterial({
      color: 0x5b8fff,
      transparent: true,
      opacity: 0.13,
      blending: AdditiveBlending,
      depthWrite: false,
    });
    for (let i = 0; i < 14; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const x = side * (0.08 + Math.random() * 0.34);
      const points = [
        new Vector3(x, this.waterY + 0.026, 0.26),
        new Vector3(x * 1.8 + (Math.random() - 0.5) * 0.2, this.waterY + 0.028, 0.7 + Math.random() * 0.22),
        new Vector3(x * 2.5 + (Math.random() - 0.5) * 0.32, this.waterY + 0.03, 1.12 + Math.random() * 0.24),
      ];
      const line = new Line(new BufferGeometry().setFromPoints(points), trunkReflectionMaterial.clone());
      line.renderOrder = 93;
      this.reflectionLines.push(line);
      this.waterGroup.add(line);
    }

    for (let i = 0; i < 9; i++) {
      const x = (Math.random() - 0.5) * 1.1;
      const reflection = new Sprite(
        new SpriteMaterial({
          map: reflectionTexture,
          color: i % 3 === 0 ? 0x8cb8ff : 0x235dff,
          opacity: 0.12 + Math.random() * 0.08,
          transparent: true,
          blending: AdditiveBlending,
          depthWrite: false,
        }),
      );
      reflection.position.set(x, this.waterY + 0.026 + Math.random() * 0.01, 0.42 + Math.random() * 1.18);
      reflection.scale.set(0.32 + Math.random() * 0.42, 0.12 + Math.random() * 0.16, 1);
      reflection.userData = { baseOpacity: 0.055 + Math.random() * 0.035, shimmer: 0.018 };
      reflection.renderOrder = 92;
      this.reflectionSprites.push(reflection);
      this.waterGroup.add(reflection);
    }

    for (let i = 0; i < 14; i++) {
      const ripple = new Mesh(
        new RingGeometry(0.12 + Math.random() * 0.28, 0.126 + Math.random() * 0.28, 72),
        new MeshBasicMaterial({
          color: i % 4 === 0 ? 0xa7d3ff : 0x3c78ff,
          side: DoubleSide,
          transparent: true,
          opacity: 0.12 + Math.random() * 0.12,
          blending: AdditiveBlending,
          depthWrite: false,
        }),
      );
      ripple.rotation.x = -Math.PI / 2;
      ripple.position.set((Math.random() - 0.5) * 4.8, this.waterY + 0.034 + Math.random() * 0.02, (Math.random() - 0.5) * 3.8);
      ripple.renderOrder = 96;
      this.waterRipples.push(ripple);
      this.waterGroup.add(ripple);
    }

    for (let i = 0; i < (this.isMobile ? 18 : 36); i++) {
      const shard = new Mesh(
        new PlaneGeometry(0.22 + Math.random() * 0.72, 0.01 + Math.random() * 0.018),
        new MeshBasicMaterial({
          color: i % 5 === 0 ? 0xb8dcff : 0x3674ff,
          side: DoubleSide,
          transparent: true,
          opacity: i % 5 === 0 ? 0.16 : 0.09,
          blending: AdditiveBlending,
          depthWrite: false,
        }),
      );
      const radius = 0.36 + Math.random() * 3.65;
      const angle = Math.random() * Math.PI * 2;
      shard.rotation.x = -Math.PI / 2;
      shard.rotation.z = angle + Math.PI / 2 + (Math.random() - 0.5) * 0.7;
      shard.position.set(Math.cos(angle) * radius, this.waterY + 0.046 + Math.random() * 0.014, Math.sin(angle) * radius);
      shard.renderOrder = 98;
      this.waterRipples.push(shard);
      this.waterGroup.add(shard);
    }
  }

  private buildButterflyReflections(): void {
    const texture = this.makeRadialTexture([
      [0, 'rgba(220,242,255,0.56)'],
      [0.22, 'rgba(82,135,255,0.28)'],
      [0.68, 'rgba(18,48,180,0.08)'],
      [1, 'rgba(0,0,0,0)'],
    ]);

    for (let i = 0; i < Math.min(this.butterflies.length, 16); i++) {
      const reflection = new Sprite(
        new SpriteMaterial({
          map: texture,
          color: i % 4 === 0 ? 0xb8d9ff : 0x3d72ff,
          opacity: 0.08,
          transparent: true,
          blending: AdditiveBlending,
          depthTest: false,
          depthWrite: false,
        }),
      );
      reflection.scale.set(0.36, 0.08, 1);
      reflection.position.set(0, this.waterY + 0.05, 1.34);
      reflection.renderOrder = 98;
      this.butterflyReflections.push(reflection);
      this.waterGroup.add(reflection);
    }
  }

  private buildBlueHaze(): void {
    const hazeTexture = this.makeRadialTexture([
      [0, 'rgba(76,170,255,0.18)'],
      [0.42, 'rgba(17,62,255,0.06)'],
      [1, 'rgba(0,0,0,0)'],
    ]);
    for (let i = 0; i < 4; i++) {
      const sprite = new Sprite(
        new SpriteMaterial({
          map: hazeTexture,
          transparent: true,
          opacity: 0.025 + Math.random() * 0.025,
          blending: AdditiveBlending,
          depthWrite: false,
        }),
      );
      sprite.position.set((Math.random() - 0.5) * 5, 0.2 + Math.random() * 3.2, -0.9 - Math.random() * 1.8);
      const s = 2.2 + Math.random() * 2.3;
      sprite.scale.set(s, s, 1);
      sprite.userData = {
        basePosition: sprite.position.clone(),
        baseScale: sprite.scale.clone(),
        baseOpacity: sprite.material.opacity,
        phase: Math.random() * Math.PI * 2,
      };
      this.blueHazeSprites.push(sprite);
      this.treeGroup.add(sprite);
    }
  }

  private bindEvents(): void {
    this.resizeHandler = () => this.resizeRenderer();
    window.addEventListener('resize', this.resizeHandler);

    this.pointerMoveHandler = (event: PointerEvent) => {
      this.pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
      this.pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
      if (!this.isDragging) return;
      const dx = event.clientX - this.lastDragX;
      const dy = event.clientY - this.lastDragY;
      this.lastDragX = event.clientX;
      this.lastDragY = event.clientY;
      this.targetRotationY += dx * 0.0048;
      this.targetRotationX += dy * 0.0032;
      this.targetRotationX = Math.max(-0.62, Math.min(0.7, this.targetRotationX));
      event.preventDefault();
    };
    this.pointerDownHandler = (event: PointerEvent) => {
      if (event.button !== 0) return;
      this.rotationControlActive = false;
      this.isDragging = true;
      this.lastDragX = event.clientX;
      this.lastDragY = event.clientY;
      this.canvas.setPointerCapture?.(event.pointerId);
    };
    this.pointerUpHandler = (event: PointerEvent) => {
      this.isDragging = false;
      this.canvas.releasePointerCapture?.(event.pointerId);
    };
    window.addEventListener('pointermove', this.pointerMoveHandler, { passive: false });
    this.canvas.addEventListener('pointerdown', this.pointerDownHandler);
    window.addEventListener('pointerup', this.pointerUpHandler);
  }

  private resizeRenderer(): void {
    const parent = this.canvas.parentElement;
    if (!parent || !this.renderer || !this.camera || !this.composer) return;
    const width = parent.clientWidth || window.innerWidth;
    const height = parent.clientHeight || window.innerHeight;
    this.renderer.setSize(width, height, false);
    this.composer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  private animate(): void {
    if (this.disposed) return;
    this.animationId = requestAnimationFrame(() => this.animate());

    const elapsed = this.clock.getElapsedTime();
    const speed = this.reduceMotion ? 0.08 : 1;
    this.camera.position.x += (this.pointer.x * 0.12 - this.camera.position.x) * 0.025 * speed;
    this.camera.position.y += (1.05 + this.pointer.y * 0.08 - this.camera.position.y) * 0.025 * speed;
    this.camera.position.z = (this.isMobile ? 11.7 : 11.9) + Math.sin(elapsed * 0.12) * 0.18 + this.zoomOffset;
    this.camera.lookAt(0, 1.18, 0);

    if (!this.isDragging && !this.rotationControlActive) {
      this.targetRotationY += ((this.pointer.x * 0.04 - 0.32) - this.targetRotationY) * 0.012 * speed;
      this.targetRotationX += (this.pointer.y * 0.025 - this.targetRotationX) * 0.012 * speed;
    }
    this.treeGroup.rotation.y += (this.targetRotationY - this.treeGroup.rotation.y) * 0.08;
    this.treeGroup.rotation.x += (this.targetRotationX - this.treeGroup.rotation.x) * 0.08;
    this.treeGroup.rotation.z = Math.sin(elapsed * 0.2) * 0.008 * speed;

    this.animatedMaterials.forEach((material) => {
      material.uniforms.uTime.value = elapsed;
    });

    this.moonRaySprites.forEach((ray, index) => {
      const baseOpacity = ray.userData['baseOpacity'] ?? 0.08;
      const phase = ray.userData['phase'] ?? index;
      ray.material.opacity = Math.max(0.025, baseOpacity + Math.sin(elapsed * 0.18 + phase) * 0.018);
      ray.position.x += Math.sin(elapsed * 0.08 + phase) * 0.0009 * speed;
    });

    this.floatingGlowOrbs.forEach((orb, index) => {
      const basePosition = orb.userData['basePosition'] as Vector3 | undefined;
      const baseScale = orb.userData['baseScale'] as Vector3 | undefined;
      const baseOpacity = orb.userData['baseOpacity'] ?? 0.18;
      const phase = orb.userData['phase'] ?? index;
      const foreground = orb.userData['foreground'] ?? false;
      if (basePosition && baseScale) {
        orb.position.set(
          basePosition.x + Math.sin(elapsed * (foreground ? 0.14 : 0.08) + phase) * (foreground ? 0.16 : 0.34),
          basePosition.y + Math.cos(elapsed * (foreground ? 0.12 : 0.06) + phase * 0.7) * (foreground ? 0.08 : 0.18),
          basePosition.z + Math.sin(elapsed * 0.07 + phase * 1.3) * (foreground ? 0.08 : 0.24),
        );
        const pulse = 1 + Math.sin(elapsed * (foreground ? 0.7 : 0.42) + phase) * (foreground ? 0.18 : 0.26);
        orb.scale.set(baseScale.x * pulse, baseScale.y * pulse, 1);
      }
      orb.material.opacity = Math.max(0.035, baseOpacity + Math.sin(elapsed * 0.55 + phase) * (foreground ? 0.1 : 0.06));
    });

    this.particleSystems.forEach((system) => {
      const attr = system.points.geometry.getAttribute('position') as Float32BufferAttribute;
      const arr = attr.array as Float32Array;
      const count = arr.length / 3;
      for (let i = 0; i < count; i++) {
        const bx = system.base[i * 3];
        const by = system.base[i * 3 + 1];
        const bz = system.base[i * 3 + 2];
        const phase = i * 0.017;
        if (system.kind === 'crown') {
          arr[i * 3] = bx + Math.sin(elapsed * 0.42 * speed + phase + by) * system.strength;
          arr[i * 3 + 1] = by + Math.sin(elapsed * 0.35 * speed + phase * 0.7) * system.strength * 0.42;
          arr[i * 3 + 2] = bz + Math.cos(elapsed * 0.38 * speed + phase + bx) * system.strength * 0.72;
        } else if (system.kind === 'firefly') {
          arr[i * 3] = bx + Math.sin(elapsed * 0.28 * speed + phase) * system.strength;
          arr[i * 3 + 1] = by + Math.cos(elapsed * 0.22 * speed + phase * 1.6) * system.strength;
          arr[i * 3 + 2] = bz;
        } else if (system.kind === 'falling') {
          let y = by - ((elapsed * 0.18 * speed + phase) % 2.4);
          if (y < -1.92) y += 6.6;
          arr[i * 3] = bx + Math.sin(elapsed * 0.35 + phase) * 0.08;
          arr[i * 3 + 1] = y;
          arr[i * 3 + 2] = bz;
        } else if (system.kind === 'trunkVolume') {
          arr[i * 3] = bx + Math.sin(elapsed * 0.32 * speed + phase + by * 1.6) * system.strength;
          arr[i * 3 + 1] = by + Math.sin(elapsed * 0.26 * speed + phase) * system.strength * 0.36;
          arr[i * 3 + 2] = bz + Math.cos(elapsed * 0.3 * speed + phase + bx) * system.strength;
        } else {
          arr[i * 3] = bx + Math.sin(elapsed * 0.5 * speed + phase) * system.strength;
          arr[i * 3 + 1] = by;
          arr[i * 3 + 2] = bz + Math.cos(elapsed * 0.38 * speed + phase) * system.strength;
        }
      }
      attr.needsUpdate = true;
    });

    this.butterflies.forEach((butterfly, index) => {
      butterfly.phase += butterfly.speed * 0.012 * speed;
      const flap = 0.72 + Math.sin(elapsed * (9.5 + index) + index) * 0.28;
      const sweep = butterfly.phase + Math.sin(elapsed * 0.08 + index) * 0.22;
      let x = butterfly.center.x + Math.cos(sweep) * butterfly.radiusX;
      let y = butterfly.altitude + Math.sin(sweep * 1.55 + index * 0.4) * butterfly.radiusY;
      let z = butterfly.center.z + Math.sin(sweep) * butterfly.depth;
      if (butterfly.path === 'sky') {
        y += Math.sin(sweep * 0.7 + index) * 0.32;
        z -= 0.35 + Math.cos(sweep * 0.9) * 0.28;
      } else if (butterfly.path === 'canopy') {
        x *= 0.82;
        y += Math.sin(sweep * 2.1) * 0.22;
        z += Math.cos(sweep * 1.2 + index) * 0.36;
      } else {
        y += Math.sin(sweep * 2.2 + index) * 0.18;
        z += 0.34 + Math.cos(sweep * 0.8) * 0.24;
      }
      butterfly.sprite.position.set(x, y, z);
      butterfly.glow.position.set(x, y, z - 0.02);
      butterfly.core.position.set(x, y, z + 0.03);
      const depthScale = Math.max(0.62, Math.min(1.3, 1 + z * 0.08));
      const tangent = new Vector3(
        -Math.sin(sweep) * butterfly.radiusX,
        Math.cos(sweep * 1.55 + index * 0.4) * butterfly.radiusY * 0.9,
        Math.cos(sweep) * butterfly.depth,
      ).normalize();
      butterfly.sprite.scale.set(butterfly.scale * depthScale * flap * 1.45, butterfly.scale * depthScale * 0.9, 1);
      butterfly.glow.scale.set(butterfly.scale * depthScale * 2.25, butterfly.scale * depthScale * 1.34, 1);
      butterfly.core.scale.set(butterfly.scale * depthScale * 0.34, butterfly.scale * depthScale * 0.34, 1);
      butterfly.sprite.material.opacity = (butterfly.foreground ? 0.74 : 0.54) + Math.sin(elapsed * 1.7 + index) * 0.08;
      butterfly.glow.material.opacity = (butterfly.foreground ? 0.42 : 0.25) + Math.sin(elapsed * 1.7 + index) * 0.09;
      butterfly.core.material.opacity = (butterfly.foreground ? 0.56 : 0.34) + Math.sin(elapsed * 2.2 + index) * 0.12;

      butterfly.trails.forEach((trail, trailIndex) => {
        const distance = (trailIndex + 1) * butterfly.scale * (butterfly.foreground ? 0.42 : 0.3);
        const wobble = Math.sin(elapsed * 1.2 + index + trailIndex) * 0.035;
        trail.position.set(
          x - tangent.x * distance,
          y - tangent.y * distance * 0.28 + wobble,
          z - tangent.z * distance * 0.48 - 0.02 * trailIndex,
        );
        const falloff = 1 - trailIndex / Math.max(1, butterfly.trails.length);
        trail.scale.set(
          butterfly.scale * depthScale * (0.9 + falloff * 0.42),
          butterfly.scale * depthScale * (0.18 + falloff * 0.2),
          1,
        );
        trail.material.opacity =
          (butterfly.foreground ? 0.08 : 0.045) +
          falloff * (butterfly.foreground ? 0.16 : 0.1) +
          Math.sin(elapsed * 1.4 + index + trailIndex) * 0.025;
      });

      const reflection = this.butterflyReflections[index];
      if (reflection) {
        reflection.position.set(x * 0.94, this.waterY + 0.052, z * 0.72);
        const nearWater = Math.max(0, 1.25 - Math.abs(y - this.waterY)) / 1.25;
        reflection.scale.set(butterfly.scale * depthScale * 0.92, butterfly.scale * depthScale * 0.16, 1);
        reflection.material.opacity = (0.045 + nearWater * 0.16) * (butterfly.foreground ? 1 : 0.62);
      }
    });

    this.leafSprites.forEach((leaf, index) => {
      leaf.position.x += Math.sin(elapsed * 0.34 + index) * 0.0008 * speed;
      leaf.position.y += Math.cos(elapsed * 0.28 + index * 0.7) * 0.0006 * speed;
      const pulse = Math.sin(elapsed * (0.36 + (index % 9) * 0.028) + leaf.userData.phase) * leaf.userData.shimmer;
      leaf.material.opacity = Math.max(0.08, Math.min(0.72, leaf.userData.baseOpacity + pulse));
    });

    this.leafMeshes.forEach((leaf, index) => {
      leaf.rotation.z += Math.sin(elapsed * 0.22 + index) * 0.00045 * speed;
      const material = leaf.material as MeshBasicMaterial;
      const baseOpacity = leaf.userData['baseOpacity'] ?? material.opacity;
      const shimmer = leaf.userData['shimmer'] ?? 0.03;
      const phase = leaf.userData['phase'] ?? index;
      material.opacity = Math.max(0.1, Math.min(0.62, baseOpacity + Math.sin(elapsed * 0.42 + phase) * shimmer));
    });

    this.canopyVolumeMeshes.forEach((volume, index) => {
      const pulse = 1 + Math.sin(elapsed * 0.18 + index * 0.7) * 0.018;
      const baseScale = volume.userData['baseScale'] as Vector3 | undefined;
      if (baseScale) {
        volume.scale.set(baseScale.x * pulse, baseScale.y * (1 + (pulse - 1) * 0.45), baseScale.z * pulse);
      }
      const material = volume.material as MeshBasicMaterial;
      material.opacity = Math.max(0.08, Math.min(0.2, material.opacity + Math.sin(elapsed * 0.16 + index) * 0.00025));
    });

    this.crownSparkles.forEach((sparkle, index) => {
      const pulse = 0.52 + Math.sin(elapsed * (0.85 + (index % 5) * 0.17) + index * 1.9) * 0.48;
      sparkle.material.opacity = 0.04 + pulse * (index % 6 === 0 ? 0.24 : 0.13);
      const s = 0.05 + pulse * (index % 6 === 0 ? 0.1 : 0.055);
      sparkle.scale.set(s, s, 1);
    });

    this.canopyRimSprites.forEach((rim, index) => {
      const baseOpacity = rim.userData['baseOpacity'] ?? 0.1;
      const phase = rim.userData['phase'] ?? index;
      const pulse = 0.5 + Math.sin(elapsed * (0.42 + (index % 4) * 0.06) + phase) * 0.5;
      rim.material.opacity = Math.max(0.035, baseOpacity + pulse * (index % 7 === 0 ? 0.08 : 0.04));
      rim.position.y += Math.sin(elapsed * 0.18 + phase) * 0.0006 * speed;
    });

    this.canopyGlowPatches.forEach((patch, index) => {
      patch.material.opacity = (index % 3 === 0 ? 0.32 : 0.24) + Math.sin(elapsed * 0.34 + index) * 0.06;
    });

    this.trunkGlowNodes.forEach((node, index) => {
      const pulse = 0.5 + Math.sin(elapsed * (0.92 + (index % 4) * 0.14) + index) * 0.5;
      node.material.opacity = 0.08 + pulse * 0.18;
    });

    this.blueHazeSprites.forEach((haze, index) => {
      const basePosition = haze.userData['basePosition'] as Vector3 | undefined;
      const baseScale = haze.userData['baseScale'] as Vector3 | undefined;
      const baseOpacity = haze.userData['baseOpacity'] ?? 0.035;
      const phase = haze.userData['phase'] ?? index;
      if (basePosition && baseScale) {
        haze.position.set(
          basePosition.x + Math.sin(elapsed * 0.12 + phase) * 0.18,
          basePosition.y + Math.cos(elapsed * 0.1 + phase * 0.7) * 0.08,
          basePosition.z + Math.sin(elapsed * 0.09 + phase * 1.3) * 0.12,
        );
        const pulse = 1 + Math.sin(elapsed * 0.16 + phase) * 0.06;
        haze.scale.set(baseScale.x * pulse, baseScale.y * pulse, 1);
      }
      haze.material.opacity = Math.max(0.012, baseOpacity + Math.sin(elapsed * 0.2 + phase) * 0.012);
      haze.rotation.z += 0.0007 * (index % 2 === 0 ? 1 : -1) * speed;
    });

    this.reflectionSprites.forEach((sprite, index) => {
      sprite.position.x += Math.sin(elapsed * 0.2 + index) * 0.0009 * speed;
      const baseOpacity = sprite.userData['baseOpacity'] ?? (index === 0 ? 0.2 : 0.08);
      const shimmer = sprite.userData['shimmer'] ?? 0.025;
      sprite.material.opacity = Math.max(
        0.018,
        baseOpacity + Math.sin(elapsed * (0.28 + index * 0.01) + index) * shimmer,
      );
    });

    this.reflectionLines.forEach((line, index) => {
      line.position.x = Math.sin(elapsed * 0.18 + index) * 0.025;
      (line.material as LineBasicMaterial).opacity = 0.07 + Math.sin(elapsed * 0.3 + index) * 0.025;
    });

    this.waterRipples.forEach((ripple, index) => {
      if (!ripple.userData['basePosition']) {
        ripple.userData['basePosition'] = ripple.position.clone();
        ripple.userData['baseScale'] = ripple.scale.clone();
        ripple.userData['baseOpacity'] = (ripple.material as MeshBasicMaterial).opacity;
        ripple.userData['phase'] = index * 0.63;
      }
      const basePosition = ripple.userData['basePosition'] as Vector3;
      const baseScale = ripple.userData['baseScale'] as Vector3;
      const phase = ripple.userData['phase'] as number;
      const drift = Math.sin(elapsed * 0.22 + phase) * 0.018 * speed;
      ripple.position.set(
        basePosition.x + Math.sin(elapsed * 0.16 + phase) * 0.018 * speed,
        basePosition.y,
        basePosition.z + Math.cos(elapsed * 0.13 + phase) * 0.014 * speed,
      );
      const pulse = 1 + Math.sin(elapsed * 0.28 + phase) * 0.035 + drift;
      ripple.scale.set(baseScale.x * pulse, baseScale.y * (1 + Math.cos(elapsed * 0.22 + phase) * 0.018), baseScale.z);
      ripple.rotation.z += 0.0009 * (index % 2 === 0 ? 1 : -1) * speed;
      const material = ripple.material as MeshBasicMaterial;
      const baseOpacity = ripple.userData['baseOpacity'] ?? material.opacity;
      material.opacity = Math.max(0.018, baseOpacity + Math.sin(elapsed * 0.34 + phase) * 0.018);
    });

    if (this.energyCore) {
      const pulse = 1 + Math.sin(elapsed * 1.1) * 0.08;
      this.energyCore.scale.setScalar((this.isMobile ? 1.45 : 1.75) * pulse);
      this.energyCore.material.opacity = 0.09 + Math.sin(elapsed * 1.6) * 0.025;
    }
    if (this.moonGlow) {
      this.moonGlow.material.opacity = 0.18 + Math.sin(elapsed * 0.45) * 0.035;
    }

    this.composer.render();
  }

  setManualRotationDegrees(degrees: number): void {
    this.rotationControlActive = true;
    this.targetRotationY = -0.32 + ((degrees % 360) * Math.PI) / 180;
  }

  setBrightnessPercent(value: number): void {
    this.brightnessPercent = Math.max(24, Math.min(82, value));
    this.applyBrightness();
  }

  private applyBrightness(): void {
    if (!this.bloomPass) return;
    const normalized = this.brightnessPercent / 100;
    const baseStrength = this.isMobile ? 0.04 : 0.065;
    this.bloomPass.strength = baseStrength * (0.35 + normalized * 0.95);
    this.bloomPass.threshold = 0.78 + (1 - normalized) * 0.1;
    this.bloomPass.radius = 0.14 + normalized * 0.08;
  }

  zoomIn(): void {
    this.setZoomOffset(this.zoomOffset - 0.48);
  }

  zoomOut(): void {
    this.setZoomOffset(this.zoomOffset + 0.48);
  }

  private setZoomOffset(value: number): void {
    this.zoomOffset = Math.max(-2.1, Math.min(2.6, value));
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
    window.removeEventListener('pointermove', this.pointerMoveHandler);
    this.canvas.removeEventListener('pointerdown', this.pointerDownHandler);
    window.removeEventListener('pointerup', this.pointerUpHandler);
    if (this.contextLostHandler) {
      this.renderer.domElement.removeEventListener('webglcontextlost', this.contextLostHandler);
      this.contextLostHandler = null;
    }

    this.scene.traverse((object: any) => {
      object.geometry?.dispose?.();
      if (Array.isArray(object.material)) {
        object.material.forEach((material: any) => material.dispose?.());
      } else {
        object.material?.dispose?.();
      }
    });
    this.textures.forEach((texture) => texture.dispose());
    this.composer.dispose();
    this.renderer.dispose();
    this.particleSystems = [];
    this.butterflies = [];
    this.leafSprites = [];
    this.leafMeshes = [];
    this.canopyVolumeMeshes = [];
    this.reflectionSprites = [];
    this.reflectionLines = [];
    this.waterRipples = [];
    this.butterflyReflections = [];
    this.crownSparkles = [];
    this.canopyGlowPatches = [];
    this.trunkGlowNodes = [];
    this.blueHazeSprites = [];
    this.moonRaySprites = [];
    this.canopyRimSprites = [];
    this.floatingGlowOrbs = [];
    this.animatedMaterials = [];
  }
}
