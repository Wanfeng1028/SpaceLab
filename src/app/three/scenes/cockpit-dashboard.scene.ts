import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  SphereGeometry,
  BufferGeometry,
  Float32BufferAttribute,
  ShaderMaterial,
  Mesh,
  Points,
  Clock,
  AdditiveBlending,
  Group,
  DoubleSide,
} from 'three';

/**
 * Cockpit Dashboard Scene — subtle background
 *
 * Starfield + faint Earth arc. No crosshair / targeting ring.
 * Rendered at low opacity behind data panels.
 */
export class CockpitDashboardScene {
  private scene!: Scene;
  private camera!: PerspectiveCamera;
  private renderer!: WebGLRenderer;
  private clock!: Clock;
  private animationId: number | null = null;
  private resizeHandler!: () => void;
  private disposed = false;

  private bgGroup!: Group;
  private starField!: Points;
  private earthArc!: Mesh;

  private contextLostHandler: ((e: Event) => void) | null = null;

  constructor(private canvas: HTMLCanvasElement) {
    this.clock = new Clock();
  }

  init(): void {
    this.initScene();
    this.createStarField();
    this.createEarthArc();
    this.bindEvents();
    this.animate();
  }

  private initScene(): void {
    this.scene = new Scene();

    this.camera = new PerspectiveCamera(60, 1, 0.1, 100);
    this.camera.position.z = 5;

    this.renderer = new WebGLRenderer({
      canvas: this.canvas,
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.contextLostHandler = (e: Event) => {
      e.preventDefault();
    };
    this.renderer.domElement.addEventListener('webglcontextlost', this.contextLostHandler);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.setClearColor(0x000000, 1);

    this.resizeRenderer();

    this.bgGroup = new Group();
    this.scene.add(this.bgGroup);
  }

  // ── Star field ──────────────────────────────────────────────────────
  private createStarField(): void {
    const count = 200;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 8 + Math.random() * 15;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
      sizes[i] = Math.random() * 2 + 0.5;
    }

    const geo = new BufferGeometry();
    geo.setAttribute('position', new Float32BufferAttribute(positions, 3));
    geo.setAttribute('aSize', new Float32BufferAttribute(sizes, 1));

    const mat = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      vertexShader: `
        attribute float aSize;
        varying float vSize;
        void main() {
          vSize = aSize;
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * (80.0 / -mvPos.z);
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        precision highp float;
        uniform float uTime;
        varying float vSize;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          if (d > 0.5) discard;
          float alpha = smoothstep(0.5, 0.0, d);
          float twinkle = sin(uTime * (vSize * 1.5) + vSize * 100.0) * 0.2 + 0.8;
          gl_FragColor = vec4(vec3(1.0), alpha * twinkle * 0.5);
        }
      `,
      uniforms: { uTime: { value: 0 } },
    });

    this.starField = new Points(geo, mat);
    this.bgGroup.add(this.starField);
  }

  // ── Earth arc ───────────────────────────────────────────────────────
  private createEarthArc(): void {
    const geo = new SphereGeometry(15, 64, 32, 0, Math.PI * 2, Math.PI * 0.6, Math.PI * 0.4);
    const mat = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      side: DoubleSide,
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;
        varying vec3 vNormal;
        void main() {
          float fresnel = pow(1.0 - abs(dot(vec3(0.0, 0.0, 1.0), vNormal)), 2.0);
          vec3 earthColor = vec3(0.0, 0.2, 0.4);
          vec3 atmosphereColor = vec3(0.0, 0.5, 0.8);
          vec3 color = mix(earthColor, atmosphereColor, fresnel);
          float alpha = fresnel * 0.25;
          gl_FragColor = vec4(color, alpha);
        }
      `,
      uniforms: {},
    });
    this.earthArc = new Mesh(geo, mat);
    this.earthArc.position.set(0, -8, -10);
    this.bgGroup.add(this.earthArc);
  }

  // ── Public API ──────────────────────────────────────────────────────
  updateMouse(_nx: number, _ny: number): void {
    // No interactive parallax — background only
  }

  // ── Events & resize ─────────────────────────────────────────────────
  private bindEvents(): void {
    this.resizeHandler = () => this.resizeRenderer();
    window.addEventListener('resize', this.resizeHandler);
  }

  private resizeRenderer(): void {
    const parent = this.canvas.parentElement;
    if (!parent) return;
    const width = parent.clientWidth;
    const height = parent.clientHeight;
    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  // ── Animation ───────────────────────────────────────────────────────
  private animate(): void {
    this.animationId = requestAnimationFrame(() => this.animate());
    if (this.disposed) return;

    const elapsed = this.clock.getElapsedTime();

    this.starField.rotation.y = elapsed * 0.008;
    this.starField.rotation.x = elapsed * 0.004;
    this.earthArc.rotation.y = elapsed * 0.015;

    (this.starField.material as ShaderMaterial).uniforms['uTime'].value = elapsed;

    this.renderer.render(this.scene, this.camera);
  }

  // ── Lifecycle ───────────────────────────────────────────────────────
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
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }
    window.removeEventListener('resize', this.resizeHandler);

    this.bgGroup.traverse((child) => {
      if ((child as Mesh).geometry) (child as Mesh).geometry.dispose();
      if ((child as Mesh).material) {
        const mat = (child as Mesh).material;
        if (Array.isArray(mat)) {
          mat.forEach((m) => m.dispose());
        } else {
          mat.dispose();
        }
      }
    });

    this.renderer.dispose();
  }
}
