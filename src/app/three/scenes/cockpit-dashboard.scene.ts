import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  SphereGeometry,
  RingGeometry,
  PlaneGeometry,
  BufferGeometry,
  Float32BufferAttribute,
  ShaderMaterial,
  Mesh,
  Points,
  Clock,
  AdditiveBlending,
  Group,
  LineBasicMaterial,
  Line,
  Vector3,
  DoubleSide,
} from 'three';

/**
 * Cockpit Dashboard Scene
 *
 * View from cockpit window: starfield, Earth arc, orbit lines,
 * HUD crosshairs, targeting reticle, and cockpit glass frame.
 */
export class CockpitDashboardScene {
  private scene!: Scene;
  private camera!: PerspectiveCamera;
  private renderer!: WebGLRenderer;
  private clock!: Clock;
  private animationId: number | null = null;
  private resizeHandler!: () => void;
  private disposed = false;

  private cockpitGroup!: Group;
  private starField!: Points;
  private earthArc!: Mesh;
  private orbitLines: Line[] = [];
  private crosshair!: Mesh;
  private targetingRing!: Mesh;
  private cockpitGlass!: Mesh;

  private scrollProgress = 0;
  private mouseX = 0;
  private mouseY = 0;

  private contextLostHandler: ((e: Event) => void) | null = null;

  constructor(private canvas: HTMLCanvasElement) {
    this.clock = new Clock();
  }

  init(): void {
    this.initScene();
    this.createStarField();
    this.createEarthArc();
    this.createOrbitLines();
    this.createCrosshair();
    this.createTargetingRing();
    this.createCockpitGlass();
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

    this.cockpitGroup = new Group();
    this.scene.add(this.cockpitGroup);
  }

  // ── Background star field ────────────────────────────────────────────
  private createStarField(): void {
    const count = 300;
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
          gl_FragColor = vec4(vec3(1.0), alpha * twinkle * 0.7);
        }
      `,
      uniforms: { uTime: { value: 0 } },
    });

    this.starField = new Points(geo, mat);
    this.cockpitGroup.add(this.starField);
  }

  // ── Earth arc (bottom of view) ───────────────────────────────────────
  private createEarthArc(): void {
    const geo = new SphereGeometry(15, 64, 32, 0, Math.PI * 2, Math.PI * 0.6, Math.PI * 0.4);
    const mat = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      side: DoubleSide,
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          // Earth atmosphere glow
          float fresnel = pow(1.0 - abs(dot(vec3(0.0, 0.0, 1.0), vNormal)), 2.0);
          vec3 earthColor = vec3(0.0, 0.3, 0.5);
          vec3 atmosphereColor = vec3(0.0, 0.6, 0.9);
          vec3 color = mix(earthColor, atmosphereColor, fresnel);
          float alpha = fresnel * 0.4;
          gl_FragColor = vec4(color, alpha);
        }
      `,
      uniforms: {},
    });
    this.earthArc = new Mesh(geo, mat);
    this.earthArc.position.set(0, -8, -10);
    this.cockpitGroup.add(this.earthArc);
  }

  // ── Orbit lines ──────────────────────────────────────────────────────
  private createOrbitLines(): void {
    const orbitData = [
      { radius: 12, tilt: 0.1, color: 0x00f0ff },
      { radius: 14, tilt: -0.15, color: 0x00ffc4 },
    ];

    orbitData.forEach(({ radius, tilt, color }) => {
      const points: Vector3[] = [];
      for (let i = 0; i <= 64; i++) {
        const angle = (i / 64) * Math.PI * 2;
        points.push(
          new Vector3(
            Math.cos(angle) * radius,
            Math.sin(angle) * radius * 0.3,
            -10 + Math.sin(angle) * 2,
          ),
        );
      }
      const geo = new BufferGeometry().setFromPoints(points);
      const mat = new LineBasicMaterial({
        color,
        transparent: true,
        opacity: 0.4,
        blending: AdditiveBlending,
      });
      const line = new Line(geo, mat);
      line.rotation.x = tilt;
      this.cockpitGroup.add(line);
      this.orbitLines.push(line);
    });
  }

  // ── HUD Crosshair ────────────────────────────────────────────────────
  private createCrosshair(): void {
    const size = 0.8;
    const gap = 0.15;

    // We'll use a simple plane for the crosshair
    const geo = new PlaneGeometry(0.02, 1.6);
    const mat = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
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
          float pulse = sin(uTime * 2.0) * 0.2 + 0.8;
          float alpha = pulse * 0.6;
          gl_FragColor = vec4(vec3(0.0, 1.0, 0.8), alpha);
        }
      `,
      uniforms: { uTime: { value: 0 } },
    });
    this.crosshair = new Mesh(geo, mat);
    this.crosshair.position.z = 2;
    this.cockpitGroup.add(this.crosshair);

    // Horizontal line
    const hGeo = new PlaneGeometry(1.6, 0.02);
    const hLine = new Mesh(hGeo, mat.clone());
    hLine.position.z = 2;
    this.cockpitGroup.add(hLine);
  }

  // ── Targeting ring ───────────────────────────────────────────────────
  private createTargetingRing(): void {
    const geo = new RingGeometry(0.6, 0.65, 64);
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
          float angle = atan(vUv.y - 0.5, vUv.x - 0.5);
          float segment = step(0.0, sin(angle * 8.0 + uTime * 2.0));
          float alpha = segment * 0.5 + 0.2;
          gl_FragColor = vec4(vec3(0.0, 0.8, 1.0), alpha);
        }
      `,
      uniforms: { uTime: { value: 0 } },
    });
    this.targetingRing = new Mesh(geo, mat);
    this.targetingRing.position.z = 2;
    this.cockpitGroup.add(this.targetingRing);
  }

  // ── Cockpit glass frame ──────────────────────────────────────────────
  private createCockpitGlass(): void {
    // Create a curved glass effect at the edges
    const geo = new SphereGeometry(4, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.3);
    const mat = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      side: DoubleSide,
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
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        void main() {
          vec3 viewDir = normalize(vViewPosition);
          float fresnel = pow(1.0 - abs(dot(viewDir, vNormal)), 3.0);
          vec3 glassColor = vec3(0.0, 0.3, 0.5);
          float alpha = fresnel * 0.15;
          gl_FragColor = vec4(glassColor, alpha);
        }
      `,
      uniforms: {},
    });
    this.cockpitGlass = new Mesh(geo, mat);
    this.cockpitGlass.position.z = -2;
    this.cockpitGlass.rotation.x = Math.PI;
    this.cockpitGroup.add(this.cockpitGlass);
  }

  // ── Public API ───────────────────────────────────────────────────────
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

    // Slow star drift
    this.starField.rotation.y = elapsed * 0.01;
    this.starField.rotation.x = elapsed * 0.005;

    // Earth arc slow rotation
    this.earthArc.rotation.y = elapsed * 0.02;

    // Orbit line rotation
    this.orbitLines.forEach((line, i) => {
      line.rotation.z = elapsed * 0.01 * (i + 1);
    });

    // Targeting ring rotation
    this.targetingRing.rotation.z = elapsed * 0.5;

    // Update shader uniforms
    (this.starField.material as ShaderMaterial).uniforms['uTime'].value = elapsed;
    (this.crosshair.material as ShaderMaterial).uniforms['uTime'].value = elapsed;
    this.cockpitGroup.children.forEach((child) => {
      if ((child as Mesh).material && (child as Mesh).material instanceof ShaderMaterial) {
        const mat = (child as Mesh).material as ShaderMaterial;
        if (mat.uniforms['uTime']) {
          mat.uniforms['uTime'].value = elapsed;
        }
      }
    });

    // Mouse parallax
    const targetRotX = this.mouseY * 0.1;
    const targetRotY = this.mouseX * 0.15;
    this.cockpitGroup.rotation.x += (targetRotX - this.cockpitGroup.rotation.x) * 0.05;
    this.cockpitGroup.rotation.y += (targetRotY - this.cockpitGroup.rotation.y) * 0.05;

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

    this.cockpitGroup.traverse((child) => {
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
