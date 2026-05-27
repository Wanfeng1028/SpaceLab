import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  TorusGeometry,
  CircleGeometry,
  BufferGeometry,
  Float32BufferAttribute,
  ShaderMaterial,
  Mesh,
  MeshBasicMaterial,
  Points,
  Clock,
  AdditiveBlending,
  Color,
  Group,
  Vector3,
  DoubleSide,
} from 'three';

/**
 * Stargate Scene
 *
 * An animated portal with a glowing torus outer ring, 72 tick marks,
 * a swirling vortex shader, 500 suction particles, and a portal glow circle.
 */
export class StargateScene {
  private scene!: Scene;
  private camera!: PerspectiveCamera;
  private renderer!: WebGLRenderer;
  private clock!: Clock;
  private animationId: number | null = null;
  private resizeHandler!: () => void;
  private disposed = false;

  private portalGroup!: Group;
  private outerRing!: Mesh;
  private tickMarks!: Points;
  private vortex!: Mesh;
  private suctionParticles!: Points;
  private portalGlow!: Mesh;

  private scrollProgress = 0;
  private mouseX = 0;
  private mouseY = 0;
  private currentRotX = 0;
  private currentRotY = 0;

  constructor(private canvas: HTMLCanvasElement) {
    this.clock = new Clock();
  }

  init(): void {
    this.initScene();
    this.createOuterRing();
    this.createTickMarks();
    this.createVortex();
    this.createSuctionParticles();
    this.createPortalGlow();
    this.bindEvents();
    this.animate();
  }

  private initScene(): void {
    this.scene = new Scene();

    this.camera = new PerspectiveCamera(50, 1, 0.1, 100);
    this.camera.position.z = 5;

    this.renderer = new WebGLRenderer({
      canvas: this.canvas,
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.setClearColor(0x000000, 1);

    this.resizeRenderer();

    this.portalGroup = new Group();
    this.scene.add(this.portalGroup);
  }

  // ── Outer ring + glow ────────────────────────────────────────────────
  private createOuterRing(): void {
    const geo = new TorusGeometry(2.0, 0.08, 16, 128);
    const mat = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          vViewPosition = -mvPos.xyz;
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        precision highp float;
        uniform float uTime;
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        void main() {
          vec3 viewDir = normalize(vViewPosition);
          float fresnel = pow(1.0 - abs(dot(viewDir, vNormal)), 1.8);
          float pulse = sin(uTime * 2.0) * 0.15 + 0.85;
          vec3 cyan   = vec3(0.0, 1.0, 0.9);
          vec3 purple = vec3(0.4, 0.0, 0.9);
          vec3 color  = mix(cyan, purple, fresnel) * pulse;
          float alpha = fresnel * 1.2 + 0.2;
          gl_FragColor = vec4(color, alpha);
        }
      `,
      uniforms: { uTime: { value: 0 } },
    });
    this.outerRing = new Mesh(geo, mat);
    this.portalGroup.add(this.outerRing);
  }

  // ── 72 tick marks ────────────────────────────────────────────────────
  private createTickMarks(): void {
    const count = 72;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      positions[i * 3] = Math.cos(angle) * 2.15;
      positions[i * 3 + 1] = Math.sin(angle) * 2.15;
      positions[i * 3 + 2] = 0;
      sizes[i] = i % 3 === 0 ? 6.0 : 3.5; // every 3rd tick is larger
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
        uniform float uTime;
        varying float vIndex;
        void main() {
          vIndex = aSize;
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * (150.0 / -mvPos.z);
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        precision highp float;
        uniform float uTime;
        varying float vIndex;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          if (d > 0.5) discard;
          float alpha = smoothstep(0.5, 0.0, d);
          float pulse = sin(uTime * 3.0 + vIndex) * 0.3 + 0.7;
          vec3 color = vec3(0.0, 1.0, 0.9) * pulse;
          gl_FragColor = vec4(color, alpha * 0.9);
        }
      `,
      uniforms: { uTime: { value: 0 } },
    });

    this.tickMarks = new Points(geo, mat);
    this.portalGroup.add(this.tickMarks);
  }

  // ── Vortex (CircleGeometry + swirl shader) ───────────────────────────
  private createVortex(): void {
    const geo = new CircleGeometry(1.9, 128);
    const mat = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      side: DoubleSide,
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;
        uniform float uTime;
        varying vec2 vUv;

        void main() {
          // Centered UV
          vec2 uv = vUv * 2.0 - 1.0;
          float r = length(uv);
          float angle = atan(uv.y, uv.x);

          // Swirl distortion
          float swirl = angle + r * 4.0 - uTime * 1.5;
          float pattern = sin(swirl * 6.0) * 0.5 + 0.5;
          pattern *= sin(r * 8.0 - uTime * 2.0) * 0.5 + 0.5;

          // Radial fade (bright center, dark edge)
          float radial = 1.0 - smoothstep(0.0, 1.0, r);
          radial = pow(radial, 0.6);

          // Color: bright cyan center → deep purple edge
          vec3 cyan   = vec3(0.0, 1.0, 0.95);
          vec3 blue   = vec3(0.1, 0.3, 1.0);
          vec3 purple = vec3(0.4, 0.0, 0.8);
          vec3 color  = mix(cyan, blue, r);
          color       = mix(color, purple, r * r);

          float intensity = pattern * radial;
          float alpha = intensity * 0.7 * (1.0 - smoothstep(0.85, 1.0, r));

          gl_FragColor = vec4(color * intensity * 1.5, alpha);
        }
      `,
      uniforms: { uTime: { value: 0 } },
    });

    this.vortex = new Mesh(geo, mat);
    this.vortex.position.z = -0.05;
    this.portalGroup.add(this.vortex);
  }

  // ── 500 suction particles ────────────────────────────────────────────
  private createSuctionParticles(): void {
    const count = 500;
    const positions = new Float32Array(count * 3);
    const offsets = new Float32Array(count * 3); // initial angle, radius, speed

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = 2.0 + Math.random() * 3.0; // start outside the ring
      positions[i * 3] = Math.cos(angle) * r;
      positions[i * 3 + 1] = Math.sin(angle) * r;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
      offsets[i * 3] = angle;
      offsets[i * 3 + 1] = r;
      offsets[i * 3 + 2] = 0.3 + Math.random() * 0.7; // speed multiplier
    }

    const geo = new BufferGeometry();
    geo.setAttribute('position', new Float32BufferAttribute(positions, 3));
    geo.setAttribute('aOffset', new Float32BufferAttribute(offsets, 3));

    const mat = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      vertexShader: `
        uniform float uTime;
        attribute vec3 aOffset;
        varying float vAlpha;
        void main() {
          float angle = aOffset.x + uTime * aOffset.z * 0.8;
          float baseR = aOffset.y;
          // Suction: radius decreases over time, wrapping around
          float cycle = mod(uTime * aOffset.z * 0.3, 1.0);
          float r = mix(baseR, 0.0, cycle);
          r = max(r, 0.05);

          vec3 pos;
          pos.x = cos(angle) * r;
          pos.y = sin(angle) * r;
          pos.z = (sin(uTime * 2.0 + aOffset.x) * 0.3) * (1.0 - cycle);

          // Fade out as particle approaches center
          vAlpha = smoothstep(0.0, 0.5, r) * 0.9;

          vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = (2.0 + aOffset.z * 2.0) * (150.0 / -mvPos.z);
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
          vec3 color = vec3(0.3, 0.8, 1.0);
          gl_FragColor = vec4(color, alpha);
        }
      `,
      uniforms: { uTime: { value: 0 } },
    });

    this.suctionParticles = new Points(geo, mat);
    this.portalGroup.add(this.suctionParticles);
  }

  // ── Portal glow circle ───────────────────────────────────────────────
  private createPortalGlow(): void {
    const geo = new CircleGeometry(2.0, 64);
    const mat = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      side: DoubleSide,
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;
        uniform float uTime;
        varying vec2 vUv;
        void main() {
          vec2 uv = vUv * 2.0 - 1.0;
          float r = length(uv);

          // Radial glow
          float glow = exp(-r * 2.5);
          glow *= 0.6 + 0.4 * sin(uTime * 1.5);

          // Edge ring
          float ring = smoothstep(0.9, 1.0, r) * (1.0 - smoothstep(1.0, 1.05, r));

          vec3 color = vec3(0.0, 0.9, 1.0) * glow;
          color += vec3(0.5, 0.0, 1.0) * ring * 0.5;

          float alpha = (glow + ring) * (1.0 - smoothstep(0.95, 1.0, r));
          gl_FragColor = vec4(color, alpha * 0.4);
        }
      `,
      uniforms: { uTime: { value: 0 } },
    });

    this.portalGlow = new Mesh(geo, mat);
    this.portalGlow.position.z = -0.1;
    this.portalGroup.add(this.portalGlow);
  }

  // ── Public API ───────────────────────────────────────────────────────
  getCenter(): Vector3 {
    const worldPos = new Vector3();
    this.portalGroup.getWorldPosition(worldPos);
    return worldPos;
  }

  updateScroll(progress: number): void {
    this.scrollProgress = progress;
  }

  updateMouse(nx: number, ny: number): void {
    this.mouseX = nx;
    this.mouseY = ny;
  }

  // ── Events & resize ──────────────────────────────────────────────────
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

  // ── Animation ────────────────────────────────────────────────────────
  private animate(): void {
    this.animationId = requestAnimationFrame(() => this.animate());
    if (this.disposed) return;

    const elapsed = this.clock.getElapsedTime();

    // Smooth rotation following scroll + mouse
    const targetRotY = this.scrollProgress * Math.PI + this.mouseX * 0.2;
    const targetRotX = this.mouseY * 0.15;
    this.currentRotX += (targetRotX - this.currentRotX) * 0.03;
    this.currentRotY += (targetRotY - this.currentRotY) * 0.03;
    this.portalGroup.rotation.x = this.currentRotX;
    this.portalGroup.rotation.y = this.currentRotY;

    // Slow idle spin
    this.portalGroup.rotation.z = elapsed * 0.05;

    // Update all shader uniforms
    (this.outerRing.material as ShaderMaterial).uniforms['uTime'].value = elapsed;
    (this.tickMarks.material as ShaderMaterial).uniforms['uTime'].value = elapsed;
    (this.vortex.material as ShaderMaterial).uniforms['uTime'].value = elapsed;
    (this.suctionParticles.material as ShaderMaterial).uniforms['uTime'].value = elapsed;
    (this.portalGlow.material as ShaderMaterial).uniforms['uTime'].value = elapsed;

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
    this.disposed = true;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }
    window.removeEventListener('resize', this.resizeHandler);

    this.portalGroup.traverse((child) => {
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
