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
  ShaderMaterial,
  SphereGeometry,
  MeshBasicMaterial,
  Mesh,
  SpriteMaterial,
  Sprite,
} from 'three';

interface BranchConfig {
  points: Vector3[];
}

interface CreatureTrail {
  curve: CatmullRomCurve3;
  points: Points;
  speed: number;
  offset: number;
  positions: Float32Array;
  basePositions: Float32Array;
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
  { cx: 0, cy: 4.0, cz: 0, rx: 2.0, ry: 1.2, rz: 2.0 },
  { cx: 1.5, cy: 3.5, cz: 0.5, rx: 1.5, ry: 1.0, rz: 1.5 },
  { cx: -1.5, cy: 3.5, cz: -0.5, rx: 1.5, ry: 1.0, rz: 1.5 },
  { cx: 0.5, cy: 3.8, cz: 1.5, rx: 1.3, ry: 1.0, rz: 1.3 },
  { cx: -0.5, cy: 3.8, cz: -1.5, rx: 1.3, ry: 1.0, rz: 1.3 },
];

export class BlueMoonTreeScene {
  private scene!: Scene;
  private camera!: PerspectiveCamera;
  private renderer!: WebGLRenderer;
  private treeGroup!: Group;
  private clock!: Clock;
  private animationId: number | null = null;
  private resizeHandler!: () => void;
  private disposed = false;
  private contextLostHandler: ((e: Event) => void) | null = null;

  private fireflies: Points | null = null;
  private fireflyBasePositions!: Float32Array;
  private creatureTrails: CreatureTrail[] = [];
  private crownPoints: Points | null = null;
  private crownBasePositions!: Float32Array;

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
    this.camera.position.set(0, 1.1, 8.2);

    this.renderer = new WebGLRenderer({
      canvas: this.canvas,
      antialias: !this.isMobile,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.contextLostHandler = (e: Event) => e.preventDefault();
    this.renderer.domElement.addEventListener('webglcontextlost', this.contextLostHandler);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.isMobile ? 1.0 : 1.5));
    this.renderer.setClearColor(0x000000, 0);
    this.resizeRenderer();

    this.treeGroup = new Group();
    this.scene.add(this.treeGroup);

    this.createTrunk();
    this.createBranches();
    this.createCrown();
    this.createFireflies();
    this.createFlowCreatures();
    this.createStarBackground();
    this.createMoon();
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

  private createTrunk(): void {
    const count = this.isMobile ? 1300 : 2600;
    const { geom } = this.buildParticleGeometry(count, () => {
      const angle = Math.random() * Math.PI * 2;
      const r = 0.08 + Math.random() * 0.07;
      const y = -0.5 + Math.random() * 3.0;
      // Taper radius slightly toward top
      const taper = 1.0 - ((y + 0.5) / 3.0) * 0.4;
      return {
        x: Math.cos(angle) * r * taper,
        y,
        z: Math.sin(angle) * r * taper,
        size: 2.0 + Math.random() * 2.0,
        alpha: 0.6 + Math.random() * 0.4,
      };
    });
    const mat = this.makeParticleMaterial(new Color(0.9, 0.7, 0.4));
    this.treeGroup.add(new Points(geom, mat));
  }

  private createBranches(): void {
    const count = this.isMobile ? 2100 : 4200;
    const particlesPerBranch = Math.floor(count / BRANCH_CONFIGS.length);

    BRANCH_CONFIGS.forEach((config) => {
      const curve = new CatmullRomCurve3(config.points);
      const { geom } = this.buildParticleGeometry(particlesPerBranch, () => {
        const t = Math.random();
        const pt = curve.getPoint(t);
        // Add slight random spread around curve
        const spread = 0.05 + t * 0.15;
        return {
          x: pt.x + (Math.random() - 0.5) * spread,
          y: pt.y + (Math.random() - 0.5) * spread,
          z: pt.z + (Math.random() - 0.5) * spread,
          size: 1.5 + Math.random() * 2.0,
          alpha: 0.4 + Math.random() * 0.5,
        };
      });
      const mat = this.makeParticleMaterial(new Color(0.3, 0.8, 0.5));
      this.treeGroup.add(new Points(geom, mat));
    });
  }

  private createCrown(): void {
    const count = this.isMobile ? 7000 : 14000;
    const particlesPerLobe = Math.floor(count / CROWN_LOBES.length);

    CROWN_LOBES.forEach((lobe, lobeIdx) => {
      const { geom, basePositions } = this.buildParticleGeometry(particlesPerLobe, () => {
        const phi = Math.acos(2 * Math.random() - 1);
        const theta = Math.random() * Math.PI * 2;
        const jitter = 0.85 + Math.random() * 0.3;
        return {
          x: lobe.cx + lobe.rx * Math.sin(phi) * Math.cos(theta) * jitter,
          y: lobe.cy + lobe.ry * Math.cos(phi) * jitter,
          z: lobe.cz + lobe.rz * Math.sin(phi) * Math.sin(theta) * jitter,
          size: 1.5 + Math.random() * 2.5,
          alpha: 0.3 + Math.random() * 0.5,
        };
      });

      // Alternate cyan and violet per lobe
      const color = lobeIdx % 2 === 0 ? new Color(0.4, 0.9, 0.8) : new Color(0.6, 0.5, 1.0);
      const mat = this.makeParticleMaterial(color);
      const points = new Points(geom, mat);
      this.treeGroup.add(points);

      // Store first lobe's data for breathing animation
      if (lobeIdx === 0) {
        this.crownPoints = points;
        this.crownBasePositions = basePositions;
      }
    });
  }

  private createFireflies(): void {
    const count = this.isMobile ? 350 : 700;
    const { geom, basePositions } = this.buildParticleGeometry(count, () => {
      const angle = Math.random() * Math.PI * 2;
      const r = 0.5 + Math.random() * 3.0;
      const y = 0.5 + Math.random() * 4.0;
      return {
        x: Math.cos(angle) * r,
        y,
        z: Math.sin(angle) * r,
        size: 2.0 + Math.random() * 4.0,
        alpha: 0.3 + Math.random() * 0.7,
      };
    });
    const mat = this.makeParticleMaterial(new Color(1.0, 0.9, 0.5));
    this.fireflies = new Points(geom, mat);
    this.fireflyBasePositions = basePositions;
    this.treeGroup.add(this.fireflies);
  }

  private createFlowCreatures(): void {
    // Pick 4 branch curves as creature paths
    const creatureBranches = [0, 2, 4, 6];
    const trailCount = 40;

    creatureBranches.forEach((branchIdx) => {
      const config = BRANCH_CONFIGS[branchIdx];
      const curve = new CatmullRomCurve3(config.points);
      const positions = new Float32Array(trailCount * 3);
      const basePositions = new Float32Array(trailCount * 3);

      // Initialize all trail points at start of curve
      for (let i = 0; i < trailCount; i++) {
        const pt = curve.getPoint(0);
        positions[i * 3] = pt.x;
        positions[i * 3 + 1] = pt.y;
        positions[i * 3 + 2] = pt.z;
        basePositions[i * 3] = pt.x;
        basePositions[i * 3 + 1] = pt.y;
        basePositions[i * 3 + 2] = pt.z;
      }

      const geom = new BufferGeometry();
      geom.setAttribute('position', new Float32BufferAttribute(positions, 3));

      // Sizes decrease along trail
      const sizes = new Float32Array(trailCount);
      const alphas = new Float32Array(trailCount);
      for (let i = 0; i < trailCount; i++) {
        const t = i / trailCount;
        sizes[i] = (1.0 - t) * 5.0 + 1.0;
        alphas[i] = (1.0 - t) * 0.8 + 0.1;
      }
      geom.setAttribute('aSize', new Float32BufferAttribute(sizes, 1));
      geom.setAttribute('aAlpha', new Float32BufferAttribute(alphas, 1));

      const mat = this.makeParticleMaterial(new Color(0.0, 0.94, 1.0));
      const points = new Points(geom, mat);
      this.treeGroup.add(points);

      this.creatureTrails.push({
        curve,
        points,
        speed: 0.08 + Math.random() * 0.06,
        offset: Math.random(),
        positions,
        basePositions,
      });
    });
  }

  private createStarBackground(): void {
    const count = this.isMobile ? 500 : 1000;
    const { geom } = this.buildParticleGeometry(count, () => ({
      x: (Math.random() - 0.5) * 50,
      y: (Math.random() - 0.5) * 50,
      z: (Math.random() - 0.5) * 50 - 10,
      size: 1.5 + Math.random() * 1.5,
      alpha: 0.3 + Math.random() * 0.4,
    }));
    const mat = this.makeParticleMaterial(new Color(1, 1, 1));
    this.scene.add(new Points(geom, mat));
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
    const sf = this.speedFactor;

    // Gentle tree sway
    this.treeGroup.rotation.z = Math.sin(elapsed * 0.3 * sf) * 0.015 * sf;
    this.treeGroup.rotation.x = Math.sin(elapsed * 0.2 * sf) * 0.01 * sf;

    // Fireflies drift
    if (this.fireflies) {
      const posAttr = this.fireflies.geometry.getAttribute('position') as Float32BufferAttribute;
      const arr = posAttr.array as Float32Array;
      const count = arr.length / 3;
      for (let i = 0; i < count; i++) {
        const bx = this.fireflyBasePositions[i * 3];
        const by = this.fireflyBasePositions[i * 3 + 1];
        const bz = this.fireflyBasePositions[i * 3 + 2];
        const phase = i * 0.7;
        arr[i * 3] = bx + Math.sin(elapsed * 0.4 * sf + phase) * 0.3;
        arr[i * 3 + 1] = by + Math.sin(elapsed * 0.3 * sf + phase * 1.3) * 0.2;
        arr[i * 3 + 2] = bz + Math.cos(elapsed * 0.35 * sf + phase * 0.9) * 0.3;
      }
      posAttr.needsUpdate = true;
    }

    // Crown breathing
    if (this.crownPoints) {
      const scale = 1.0 + Math.sin(elapsed * 0.25 * sf) * 0.015 * sf;
      this.crownPoints.scale.set(scale, scale, scale);
    }

    // Flow creatures along curves
    this.creatureTrails.forEach((trail) => {
      const posAttr = trail.points.geometry.getAttribute('position') as Float32BufferAttribute;
      const arr = posAttr.array as Float32Array;
      const count = arr.length / 3;
      const headT = (((elapsed * trail.speed * sf + trail.offset) % 1) + 1) % 1;

      for (let i = 0; i < count; i++) {
        const offset = i / count;
        const t = (((headT - offset * 0.3) % 1) + 1) % 1;
        const pt = trail.curve.getPoint(t);
        arr[i * 3] = pt.x;
        arr[i * 3 + 1] = pt.y;
        arr[i * 3 + 2] = pt.z;
      }
      posAttr.needsUpdate = true;
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
    this.fireflies = null;
    this.crownPoints = null;
    this.creatureTrails = [];
  }

  private createMoon(): void {
    // Moon sphere
    const moonGeom = new SphereGeometry(0.5, 32, 32);
    const moonMat = new MeshBasicMaterial({ color: 0x88aaff });
    const moon = new Mesh(moonGeom, moonMat);
    moon.position.set(3, 4, -5);
    this.scene.add(moon);

    // Moon glow (sprite)
    const spriteMat = new SpriteMaterial({
      color: 0x88aaff,
      transparent: true,
      opacity: 0.3,
      blending: AdditiveBlending,
    });
    const sprite = new Sprite(spriteMat);
    sprite.scale.set(2, 2, 1);
    sprite.position.copy(moon.position);
    this.scene.add(sprite);
  }
}
