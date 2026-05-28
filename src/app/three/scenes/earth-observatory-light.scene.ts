import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  SphereGeometry,
  TorusGeometry,
  BufferGeometry,
  Float32BufferAttribute,
  ShaderMaterial,
  Mesh,
  MeshBasicMaterial,
  Material,
  Points,
  Clock,
  AdditiveBlending,
  Color,
  Group,
  Vector3,
  DoubleSide,
  LineBasicMaterial,
  Line,
  EllipseCurve,
} from 'three';

/**
 * Earth Observatory Scene - Light Theme
 *
 * Light Earth hemisphere with remote sensing scan lines,
 * satellite orbits, atmospheric glow, and minimal star dust.
 * Optimized for light background.
 */
export class EarthObservatoryLightScene {
  private scene!: Scene;
  private camera!: PerspectiveCamera;
  private renderer!: WebGLRenderer;
  private clock!: Clock;
  private animationId: number | null = null;
  private resizeHandler!: () => void;
  private disposed = false;

  private earthGroup!: Group;
  private earth!: Mesh;
  private atmosphere!: Mesh;
  private scanLine!: Mesh;
  private satelliteOrbits: Line[] = [];
  private gridTiles: Points[] = [];
  private starDust!: Points;

  private scrollProgress = 0;
  private mouseX = 0;
  private mouseY = 0;
  private targetRotX = 0;
  private targetRotY = 0;
  private currentRotX = 0;
  private currentRotY = 0;
  private scanProgress = 1;

  private contextLostHandler: ((e: Event) => void) | null = null;

  constructor(private canvas: HTMLCanvasElement) {
    this.clock = new Clock();
  }

  init(): void {
    this.initScene();
    this.createEarth();
    this.createAtmosphere();
    this.createScanLines();
    this.createSatelliteOrbits();
    this.createStarDust();
    this.bindEvents();
    this.animate();
  }

  private initScene(): void {
    this.scene = new Scene();

    this.camera = new PerspectiveCamera(60, 1, 0.1, 100);
    this.camera.position.z = 3;

    this.renderer = new WebGLRenderer({
      canvas: this.canvas,
      antialias: false,
      alpha: true, // 透明背景
      powerPreference: 'high-performance',
    });
    this.contextLostHandler = (e: Event) => {
      e.preventDefault();
    };
    this.renderer.domElement.addEventListener('webglcontextlost', this.contextLostHandler);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.setClearColor(0x000000, 0); // 透明背景

    this.resizeRenderer();

    this.earthGroup = new Group();
    this.scene.add(this.earthGroup);
  }

  // ── Earth with terrain/contour texture ──────────────────────────────
  private createEarth(): void {
    const geo = new SphereGeometry(1, 64, 64);
    const mat = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        varying vec2 vUv;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vUv = uv;
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
        varying vec2 vUv;
        
        // Simplex noise function
        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
        vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
        
        float snoise(vec3 v) {
          const vec2 C = vec2(1.0/6.0, 1.0/3.0);
          const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
          vec3 i = floor(v + dot(v, C.yyy));
          vec3 x0 = v - i + dot(i, C.xxx);
          vec3 g = step(x0.yzx, x0.xyz);
          vec3 l = 1.0 - g;
          vec3 i1 = min(g.xyz, l.zxy);
          vec3 i2 = max(g.xyz, l.zxy);
          vec3 x1 = x0 - i1 + C.xxx;
          vec3 x2 = x0 - i2 + C.yyy;
          vec3 x3 = x0 - D.yyy;
          i = mod289(i);
          vec4 p = permute(permute(permute(
            i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));
          float n_ = 0.142857142857;
          vec3 ns = n_ * D.wyz - D.xzx;
          vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
          vec4 x_ = floor(j * ns.z);
          vec4 y_ = floor(j - 7.0 * x_);
          vec4 x = x_ *ns.x + ns.yyyy;
          vec4 y = y_ *ns.x + ns.yyyy;
          vec4 h = 1.0 - abs(x) - abs(y);
          vec4 b0 = vec4(x.xy, y.xy);
          vec4 b1 = vec4(x.zw, y.zw);
          vec4 s0 = floor(b0)*2.0 + 1.0;
          vec4 s1 = floor(b1)*2.0 + 1.0;
          vec4 sh = -step(h, vec4(0.0));
          vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
          vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
          vec3 p0 = vec3(a0.xy, h.x);
          vec3 p1 = vec3(a0.zw, h.y);
          vec3 p2 = vec3(a1.xy, h.z);
          vec3 p3 = vec3(a1.zw, h.w);
          vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
          p0 *= norm.x;
          p1 *= norm.y;
          p2 *= norm.z;
          p3 *= norm.w;
          vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
          m = m * m;
          return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
        }
        
        void main() {
          vec3 viewDir = normalize(vViewPosition);
          float fresnel = pow(1.0 - abs(dot(viewDir, vNormal)), 3.0);
          
          // Terrain pattern using noise
          float terrain = snoise(vec3(vUv * 8.0, uTime * 0.1)) * 0.5 + 0.5;
          float continent = snoise(vec3(vUv * 3.0, 0.0)) * 0.5 + 0.5;
          float combined = terrain * 0.3 + continent * 0.7;
          
          // Grid pattern for remote sensing effect
          float gridX = abs(sin(vUv.x * 40.0));
          float gridY = abs(sin(vUv.y * 20.0));
          float grid = max(
            smoothstep(0.95, 1.0, gridX),
            smoothstep(0.95, 1.0, gridY)
          ) * 0.3;
          
          // Remote sensing colors for light theme
          vec3 landColor = mix(
            vec3(0.2, 0.6, 0.4),  // Green land
            vec3(0.1, 0.4, 0.6),  // Blue water
            combined
          );
          
          // Add grid overlay
          landColor += vec3(0.1, 0.3, 0.5) * grid;
          
          // Fresnel glow for atmosphere
          vec3 glowColor = vec3(0.4, 0.7, 1.0);
          float glow = fresnel * 1.5;
          
          // Scan line effect
          float scanLine = sin(vUv.y * 50.0 + uTime * 2.0) * 0.5 + 0.5;
          scanLine = pow(scanLine, 20.0) * 0.4;
          
          vec3 finalColor = landColor + glowColor * glow + vec3(0.2, 0.5, 0.8) * scanLine;
          float alpha = 0.7 + fresnel * 0.3;
          
          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
      uniforms: { uTime: { value: 0 } },
    });

    this.earth = new Mesh(geo, mat);
    this.earthGroup.add(this.earth);
  }

  // ── Atmospheric glow ───────────────────────────────────────────────
  private createAtmosphere(): void {
    const geo = new SphereGeometry(1.1, 32, 32);
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
          float fresnel = pow(1.0 - abs(dot(viewDir, vNormal)), 4.0);
          float pulse = sin(uTime * 0.5) * 0.1 + 0.9;
          vec3 atmosphereColor = vec3(0.3, 0.6, 1.0);
          float intensity = fresnel * pulse * 1.2;
          gl_FragColor = vec4(atmosphereColor, intensity * 0.6);
        }
      `,
      uniforms: { uTime: { value: 0 } },
    });

    this.atmosphere = new Mesh(geo, mat);
    this.earthGroup.add(this.atmosphere);
  }

  // ── Remote sensing scan lines ──────────────────────────────────────
  private createScanLines(): void {
    const geo = new TorusGeometry(1.15, 0.005, 8, 100);
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
          float scan = sin(vUv.x * 40.0 + uTime * 3.0) * 0.5 + 0.5;
          scan = pow(scan, 8.0);
          vec3 scanColor = vec3(0.2, 0.8, 1.0);
          gl_FragColor = vec4(scanColor, scan * 0.8);
        }
      `,
      uniforms: { uTime: { value: 0 } },
    });

    this.scanLine = new Mesh(geo, mat);
    this.scanLine.rotation.x = Math.PI * 0.5;
    this.earthGroup.add(this.scanLine);
  }

  // ── Satellite orbits ───────────────────────────────────────────────
  private createSatelliteOrbits(): void {
    const orbits = [
      { radius: 1.3, tilt: 0.2, speed: 0.001 },
      { radius: 1.4, tilt: -0.3, speed: 0.0015 },
      { radius: 1.5, tilt: 0.1, speed: 0.0008 },
    ];

    orbits.forEach((orbit, i) => {
      const points = [];
      const segments = 100;

      for (let j = 0; j <= segments; j++) {
        const angle = (j / segments) * Math.PI * 2;
        const x = Math.cos(angle) * orbit.radius;
        const y = Math.sin(angle) * orbit.radius * Math.sin(orbit.tilt);
        const z = Math.sin(angle) * orbit.radius * Math.cos(orbit.tilt);
        points.push(new Vector3(x, y, z));
      }

      const geo = new BufferGeometry().setFromPoints(points);
      const mat = new LineBasicMaterial({
        color: 0x69d7ff,
        transparent: true,
        opacity: 0.4,
      });

      const line = new Line(geo, mat);
      line.userData = { speed: orbit.speed, radius: orbit.radius, tilt: orbit.tilt };
      this.earthGroup.add(line);
      this.satelliteOrbits.push(line);
    });
  }

  // ── Star dust background ───────────────────────────────────────────
  private createStarDust(): void {
    const count = 100;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 2 + Math.random() * 3;
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
          gl_PointSize = aSize * (100.0 / -mvPos.z);
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
          float twinkle = sin(uTime * (vSize * 2.0) + vSize * 100.0) * 0.3 + 0.7;
          gl_FragColor = vec4(vec3(0.3, 0.4, 0.5), alpha * twinkle * 0.4);
        }
      `,
      uniforms: { uTime: { value: 0 } },
    });

    this.starDust = new Points(geo, mat);
    this.scene.add(this.starDust);
  }

  // ── Public API ───────────────────────────────────────────────────────
  updateScroll(progress: number): void {
    this.scrollProgress = progress;
  }

  updateMouse(nx: number, ny: number): void {
    this.mouseX = nx;
    this.mouseY = ny;
  }

  triggerScanWave(): void {
    // Trigger a scan wave effect by resetting scan progress
    this.scanProgress = 0;
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

    // Smooth rotation following mouse
    this.targetRotY = this.mouseX * 0.3;
    this.targetRotX = this.mouseY * 0.2;
    this.currentRotX += (this.targetRotX - this.currentRotX) * 0.05;
    this.currentRotY += (this.targetRotY - this.currentRotY) * 0.05;
    this.earthGroup.rotation.x = this.currentRotX;
    this.earthGroup.rotation.y = this.currentRotY + elapsed * 0.05;

    // Update shader uniforms
    (this.earth.material as ShaderMaterial).uniforms['uTime'].value = elapsed;
    (this.atmosphere.material as ShaderMaterial).uniforms['uTime'].value = elapsed;
    (this.scanLine.material as ShaderMaterial).uniforms['uTime'].value = elapsed;
    (this.starDust.material as ShaderMaterial).uniforms['uTime'].value = elapsed;

    // Satellite orbit rotation
    this.satelliteOrbits.forEach((orbit) => {
      const data = orbit.userData as { speed: number; radius: number; tilt: number };
      orbit.rotation.y += data.speed;
    });

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

    this.earthGroup.traverse((child) => {
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

    this.starDust.geometry.dispose();
    (this.starDust.material as ShaderMaterial).dispose();

    this.renderer.dispose();
  }
}
