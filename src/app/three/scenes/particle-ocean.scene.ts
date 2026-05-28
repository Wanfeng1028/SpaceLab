import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  BufferGeometry,
  Float32BufferAttribute,
  ShaderMaterial,
  Points,
  Clock,
  AdditiveBlending,
} from 'three';

/**
 * Particle Ocean Scene
 *
 * A wave field of particles driven by vertex shaders with mouse gravity
 * and click ripple effects. 12 800 particles on desktop, 3 000 on mobile.
 */
export class ParticleOceanScene {
  private scene!: Scene;
  private camera!: PerspectiveCamera;
  private renderer!: WebGLRenderer;
  private points!: Points;
  private clock!: Clock;
  private animationId: number | null = null;
  private resizeHandler!: () => void;
  private disposed = false;

  private scrollProgress = 0;
  private mouseX = 0;
  private mouseY = 0;
  private prevMouseX = 0;
  private prevMouseY = 0;
  private mouseDx = 0;
  private mouseDy = 0;

  private rippleTime = -10;
  private rippleX = 0;
  private rippleY = 0;

  private pointerDownHandler!: (e: PointerEvent) => void;

  private particleCount: number;

  private contextLostHandler: ((e: Event) => void) | null = null;

  constructor(private canvas: HTMLCanvasElement) {
    this.clock = new Clock();
    const isMobile =
      /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
      window.innerWidth < 768;
    this.particleCount = isMobile ? 3000 : 12800;
  }

  init(): void {
    this.initScene();
    this.createParticles();
    this.bindEvents();
    this.animate();
  }

  private initScene(): void {
    this.scene = new Scene();

    this.camera = new PerspectiveCamera(50, 1, 0.1, 100);
    this.camera.position.z = 6;

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
  }

  // ── Particle grid ────────────────────────────────────────────────────
  private createParticles(): void {
    const count = this.particleCount;
    const cols = Math.round(Math.sqrt(count * 2));
    const rows = Math.ceil(count / cols);
    const positions = new Float32Array(count * 3);
    const uvs = new Float32Array(count * 2);
    const randoms = new Float32Array(count);

    const spanX = 10;
    const spanZ = 5;

    for (let i = 0; i < count; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const u = col / (cols - 1);
      const v = row / (rows - 1);

      positions[i * 3] = (u - 0.5) * spanX;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = (v - 0.5) * spanZ;

      uvs[i * 2] = u;
      uvs[i * 2 + 1] = v;

      randoms[i] = Math.random();
    }

    const geo = new BufferGeometry();
    geo.setAttribute('position', new Float32BufferAttribute(positions, 3));
    geo.setAttribute('aUv', new Float32BufferAttribute(uvs, 2));
    geo.setAttribute('aRandom', new Float32BufferAttribute(randoms, 1));

    const mat = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      vertexShader: `
        uniform float uTime;
        uniform float uElapsed;
        uniform vec2  uMouse;
        uniform vec2  uMouseD;
        uniform float uScroll;
        uniform float uRippleTime;
        uniform vec2  uRippleCenter;

        attribute vec2  aUv;
        attribute float aRandom;

        varying float vAlpha;

        void main() {
          vec3 pos = position;

          // Base wave
          float wave = sin(pos.x * 1.2 + uTime * 0.8)
                     * cos(pos.z * 1.5 + uTime * 0.6) * 0.4;
          wave += sin(pos.x * 0.6 - uTime * 0.4 + pos.z * 0.8) * 0.25;
          pos.y += wave * (1.0 + uScroll * 0.8);

          // Mouse gravity (attraction toward cursor in UV space)
          vec2 diff = uMouse - aUv;
          float dist = length(diff);
          float pull = 1.0 / (dist * 15.0 + 0.5);
          pull *= length(uMouseD) * 6.0;
          pos.y += pull;

          // Click ripple
          float rippleAge = uElapsed - uRippleTime;
          if (rippleAge < 3.0 && rippleAge > 0.0) {
            vec2 rd = aUv - uRippleCenter;
            float rDist = length(rd);
            float ring = abs(rDist - rippleAge * 0.5);
            float ripple = exp(-ring * 12.0) * (1.0 - rippleAge / 3.0);
            pos.y += ripple * 1.5;
          }

          // Depth-based alpha
          vAlpha = 0.35 + aRandom * 0.65;

          vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = (2.5 + aRandom * 1.5) * (200.0 / -mvPos.z);
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        precision highp float;
        varying float vAlpha;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          if (d > 0.5) discard;
          float alpha = smoothstep(0.5, 0.0, d) * vAlpha;
          vec3 cyan = vec3(0.0, 0.95, 1.0);
          vec3 white = vec3(0.8, 1.0, 1.0);
          vec3 color = mix(cyan, white, alpha);
          gl_FragColor = vec4(color, alpha);
        }
      `,
      uniforms: {
        uTime: { value: 0 },
        uElapsed: { value: 0 },
        uMouse: { value: [0.5, 0.5] },
        uMouseD: { value: [0, 0] },
        uScroll: { value: 0 },
        uRippleTime: { value: -10 },
        uRippleCenter: { value: [0.5, 0.5] },
      },
    });

    this.points = new Points(geo, mat);
    this.scene.add(this.points);
  }

  // ── Public API ───────────────────────────────────────────────────────
  updateScroll(progress: number): void {
    this.scrollProgress = progress;
  }

  updateMouse(nx: number, ny: number): void {
    this.mouseX = nx;
    this.mouseY = ny;
  }

  triggerRipple(nx: number, ny: number): void {
    this.rippleTime = this.clock.getElapsedTime();
    this.rippleX = nx * 0.5 + 0.5; // remap -1..1 → 0..1 (UV space)
    this.rippleY = ny * 0.5 + 0.5;
  }

  // ── Events ───────────────────────────────────────────────────────────
  private bindEvents(): void {
    this.resizeHandler = () => this.resizeRenderer();
    window.addEventListener('resize', this.resizeHandler);

    this.pointerDownHandler = (e: PointerEvent) => {
      const rect = this.canvas.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      this.triggerRipple(nx, ny);
    };
    this.canvas.addEventListener('pointerdown', this.pointerDownHandler);
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

  // ── Animation ────────────────────────────────────────────────────────
  private animate(): void {
    this.animationId = requestAnimationFrame(() => this.animate());
    if (this.disposed) return;

    const elapsed = this.clock.getElapsedTime();

    // Track mouse delta (movement speed)
    this.mouseDx = this.mouseX - this.prevMouseX;
    this.mouseDy = this.mouseY - this.prevMouseY;
    this.prevMouseX = this.mouseX;
    this.prevMouseY = this.mouseY;

    // Update uniforms
    const uniforms = (this.points.material as ShaderMaterial).uniforms;
    uniforms['uTime'].value = elapsed;
    uniforms['uElapsed'].value = elapsed;
    uniforms['uMouse'].value = [this.mouseX, this.mouseY];
    uniforms['uMouseD'].value = [this.mouseDx, this.mouseDy];
    uniforms['uScroll'].value = this.scrollProgress;
    uniforms['uRippleTime'].value = this.rippleTime;
    uniforms['uRippleCenter'].value = [this.rippleX, this.rippleY];

    this.renderer.render(this.scene, this.camera);
  }

  // ── Lifecycle ────────────────────────────────────────────────────────
  pause(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  resume(): void {
    if (!this.disposed && this.animationId === null) {
      this.clock.getDelta(); // reset delta
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
    this.canvas.removeEventListener('pointerdown', this.pointerDownHandler);
    this.renderer.dispose();
    this.points.geometry.dispose();
    (this.points.material as ShaderMaterial).dispose();
  }
}
