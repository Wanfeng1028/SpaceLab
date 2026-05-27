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
 * Earth Observatory Scene
 *
 * Dark Earth hemisphere with remote sensing scan lines,
 * satellite orbits, atmospheric glow, and minimal star dust.
 */
export class EarthObservatoryScene {
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
  private currentRotX = 0;
  private currentRotY = 0;

  private scanProgress = 0;

  constructor(private canvas: HTMLCanvasElement) {
    this.clock = new Clock();
  }

  init(): void {
    this.initScene();
    this.createEarth();
    this.createAtmosphere();
    this.createScanLine();
    this.createSatelliteOrbits();
    this.createGridTiles();
    this.createStarDust();
    this.bindEvents();
    this.animate();
  }

  private initScene(): void {
    this.scene = new Scene();

    this.camera = new PerspectiveCamera(60, 1, 0.1, 100);
    this.camera.position.z = 4;

    this.renderer = new WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);

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
        varying vec3 vPosition;
        varying vec2 vUv;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;
          vUv = uv;
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        precision highp float;
        uniform float uTime;
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec2 vUv;

        // Simple terrain noise
        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }

        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          float a = hash(i);
          float b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0));
          float d = hash(i + vec2(1.0, 1.0));
          return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
        }

        void main() {
          // Create terrain-like pattern
          float terrain = noise(vUv * 8.0) * 0.5 + noise(vUv * 16.0) * 0.25;
          
          // Contour lines
          float contour = fract(terrain * 10.0);
          contour = smoothstep(0.0, 0.1, contour) * smoothstep(0.1, 0.0, contour);
          
          // Base earth color (dark land/water)
          vec3 landColor = vec3(0.05, 0.15, 0.1);
          vec3 waterColor = vec3(0.02, 0.05, 0.08);
          vec3 baseColor = mix(waterColor, landColor, terrain);
          
          // Add contour lines
          vec3 contourColor = vec3(0.0, 0.8, 0.6);
          baseColor = mix(baseColor, contourColor, contour * 0.3);
          
          // Fresnel rim
          vec3 viewDir = normalize(cameraPosition - vPosition);
          float rim = pow(1.0 - abs(dot(viewDir, vNormal)), 2.0);
          
          float intensity = (0.3 + rim * 0.5) * (0.8 + sin(uTime * 0.5) * 0.2);
          gl_FragColor = vec4(baseColor * intensity, intensity);
        }
      `,
      uniforms: { uTime: { value: 0 } },
    });
    this.earth = new Mesh(geo, mat);
    this.earthGroup.add(this.earth);
  }

  // ── Atmosphere (cyan-blue glow) ──────────────────────────────────────
  private createAtmosphere(): void {
    const geo = new SphereGeometry(1.12, 64, 64);
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
          float fresnel = pow(1.0 - abs(dot(viewDir, vNormal)), 2.5);
          vec3 cyan = vec3(0.0, 0.9, 1.0);
          vec3 blue = vec3(0.1, 0.4, 0.9);
          vec3 color = mix(cyan, blue, fresnel);
          gl_FragColor = vec4(color * fresnel, fresnel * 0.6);
        }
      `,
      uniforms: {},
    });
    this.atmosphere = new Mesh(geo, mat);
    this.earthGroup.add(this.atmosphere);
  }

  // ── Scan line (sweeps across earth surface) ──────────────────────────
  private createScanLine(): void {
    const geo = new SphereGeometry(1.01, 64, 64, 0, Math.PI * 0.1);
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
          float scan = smoothstep(0.0, 0.1, vUv.x) * smoothstep(1.0, 0.9, vUv.x);
          vec3 scanColor = vec3(0.0, 1.0, 0.8);
          float alpha = scan * 0.5 * (0.8 + sin(uTime * 2.0) * 0.2);
          gl_FragColor = vec4(scanColor, alpha);
        }
      `,
      uniforms: { uTime: { value: 0 } },
    });
    this.scanLine = new Mesh(geo, mat);
    this.earthGroup.add(this.scanLine);
  }

  // ── Satellite orbits (2-3 orbit lines) ──────────────────────────────
  private createSatelliteOrbits(): void {
    const orbitData = [
      { radius: 1.5, tilt: 0.3, color: 0x00f0ff },
      { radius: 1.8, tilt: -0.2, color: 0x00ffc4 },
      { radius: 2.1, tilt: 0.1, color: 0x7b00ff },
    ];

    orbitData.forEach(({ radius, tilt, color }) => {
      const curve = new EllipseCurve(0, 0, radius, radius * 0.8, 0, Math.PI * 2);
      const points = curve.getPoints(128);
      const geo = new BufferGeometry().setFromPoints(points);
      const mat = new LineBasicMaterial({
        color,
        transparent: true,
        opacity: 0.4,
        blending: AdditiveBlending,
      });
      const line = new Line(geo, mat);
      line.rotation.x = tilt;
      line.rotation.y = Math.random() * Math.PI;
      this.earthGroup.add(line);
      this.satelliteOrbits.push(line);
    });
  }

  // ── Grid tiles (flickering remote sensing grid) ──────────────────────
  private createGridTiles(): void {
    const count = 100;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 1.02;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
      sizes[i] = Math.random() * 2.0 + 0.5;
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
        varying float vAlpha;
        void main() {
          vAlpha = sin(uTime * 3.0 + aSize * 10.0) * 0.5 + 0.5;
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * (100.0 / -mvPos.z);
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        precision highp float;
        varying float vAlpha;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          if (d > 0.5) discard;
          float alpha = smoothstep(0.5, 0.0, d) * vAlpha * 0.6;
          vec3 gridColor = vec3(0.0, 1.0, 0.7);
          gl_FragColor = vec4(gridColor, alpha);
        }
      `,
      uniforms: { uTime: { value: 0 } },
    });

    const tiles = new Points(geo, mat);
    this.earthGroup.add(tiles);
    this.gridTiles.push(tiles);
  }

  // ── Star dust (minimal, not overwhelming) ────────────────────────────
  private createStarDust(): void {
    const count = 100; // Reduced from 300
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 3 + Math.random() * 3;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
      sizes[i] = Math.random() * 1.5 + 0.5;
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
          float twinkle = sin(uTime * (vSize * 2.0) + vSize * 100.0) * 0.3 + 0.7;
          gl_FragColor = vec4(vec3(1.0), alpha * twinkle * 0.5);
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

    // Smooth rotation following scroll + mouse
    const targetRotY = this.scrollProgress * Math.PI * 2 + this.mouseX * 0.3;
    const targetRotX = this.mouseY * 0.2;
    this.currentRotX += (targetRotX - this.currentRotX) * 0.03;
    this.currentRotY += (targetRotY - this.currentRotY) * 0.03;
    this.earthGroup.rotation.x = this.currentRotX;
    this.earthGroup.rotation.y = this.currentRotY;

    // Slow idle rotation
    this.earthGroup.rotation.y += elapsed * 0.05;

    // Scan line rotation
    this.scanLine.rotation.y = elapsed * 0.3;

    // Atmosphere gentle pulse
    const atmoPulse = 1.0 + Math.sin(elapsed * 1.5) * 0.02;
    this.atmosphere.scale.set(atmoPulse, atmoPulse, atmoPulse);

    // Satellite orbit rotation
    this.satelliteOrbits.forEach((orbit, i) => {
      orbit.rotation.z += 0.002 * (i + 1);
    });

    // Star dust rotation
    this.starDust.rotation.y = elapsed * 0.01;

    // Update shader uniforms
    (this.earth.material as ShaderMaterial).uniforms['uTime'].value = elapsed;
    (this.scanLine.material as ShaderMaterial).uniforms['uTime'].value = elapsed;
    this.gridTiles.forEach((tiles) => {
      (tiles.material as ShaderMaterial).uniforms['uTime'].value = elapsed;
    });
    (this.starDust.material as ShaderMaterial).uniforms['uTime'].value = elapsed;

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
    this.disposed = true;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }
    window.removeEventListener('resize', this.resizeHandler);

    this.earthGroup.traverse((child) => {
      const obj = child as Mesh & { geometry?: BufferGeometry; material?: Material | Material[] };
      if (obj.geometry) {
        obj.geometry.dispose();
      }
      if (obj.material) {
        const mat = obj.material;
        if (Array.isArray(mat)) {
          mat.forEach((m) => m.dispose());
        } else {
          mat.dispose();
        }
      }
    });

    if (this.starDust) {
      this.starDust.geometry?.dispose();
      if (this.starDust.material) {
        (this.starDust.material as ShaderMaterial).dispose();
      }
    }

    this.renderer.dispose();
  }
}
