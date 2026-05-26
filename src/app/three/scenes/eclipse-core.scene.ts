import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  SphereGeometry,
  TorusGeometry,
  RingGeometry,
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
 * Eclipse Core Scene
 *
 * Dark sphere core with Fresnel atmosphere (cyan→purple),
 * animated corona with noise shader (cyan→blue→purple),
 * 3 orbit rings, 300 star particles, and a triggerPulse() expanding ring.
 */
export class EclipseCoreScene {
  private scene!: Scene;
  private camera!: PerspectiveCamera;
  private renderer!: WebGLRenderer;
  private clock!: Clock;
  private animationId: number | null = null;
  private resizeHandler!: () => void;
  private disposed = false;

  private coreGroup!: Group;
  private atmosphere!: Mesh;
  private corona!: Mesh;
  private orbitRings: Mesh[] = [];
  private stars!: Points;
  private pulseRing!: Mesh;
  private pulseStartTime = -10;
  private pulseActive = false;

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
    this.createCore();
    this.createAtmosphere();
    this.createCorona();
    this.createOrbitRings();
    this.createStars();
    this.createPulseRing();
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

    this.coreGroup = new Group();
    this.scene.add(this.coreGroup);
  }

  // ── Core sphere ──────────────────────────────────────────────────────
  private createCore(): void {
    const geo = new SphereGeometry(1, 64, 64);
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
          float rim = pow(1.0 - abs(dot(viewDir, vNormal)), 3.0);
          float pulse = sin(uTime * 2.0) * 0.15 + 0.85;
          float intensity = (0.08 + rim * 0.5) * pulse;
          gl_FragColor = vec4(vec3(0.6, 0.0, 0.8) * intensity, intensity);
        }
      `,
      uniforms: { uTime: { value: 0 } },
    });
    const mesh = new Mesh(geo, mat);
    this.coreGroup.add(mesh);
  }

  // ── Atmosphere (Fresnel: cyan → purple) ──────────────────────────────
  private createAtmosphere(): void {
    const geo = new SphereGeometry(1.15, 64, 64);
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
          vec3 cyan   = vec3(0.0, 1.0, 0.9);
          vec3 purple = vec3(0.5, 0.0, 1.0);
          vec3 color  = mix(cyan, purple, fresnel);
          gl_FragColor = vec4(color * fresnel, fresnel * 0.8);
        }
      `,
      uniforms: {},
    });
    this.atmosphere = new Mesh(geo, mat);
    this.coreGroup.add(this.atmosphere);
  }

  // ── Corona (noise shader: cyan → blue → purple) ─────────────────────
  private createCorona(): void {
    const geo = new SphereGeometry(1.4, 64, 64);
    const mat = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      side: DoubleSide,
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec3 vViewPosition;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          vViewPosition = -mvPos.xyz;
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        precision highp float;
        uniform float uTime;
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec3 vViewPosition;

        // Simplex-like noise
        vec3 mod289(vec3 x){ return x - floor(x * (1.0/289.0)) * 289.0; }
        vec4 mod289(vec4 x){ return x - floor(x * (1.0/289.0)) * 289.0; }
        vec4 permute(vec4 x){ return mod289(((x * 34.0) + 1.0) * x); }
        vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }
        float snoise(vec3 v){
          const vec2 C = vec2(1.0/6.0, 1.0/3.0);
          const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
          vec3 i  = floor(v + dot(v, C.yyy));
          vec3 x0 = v - i + dot(i, C.xxx);
          vec3 g  = step(x0.yzx, x0.xyz);
          vec3 l  = 1.0 - g;
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
          vec4 j  = p - 49.0 * floor(p * ns.z * ns.z);
          vec4 x_ = floor(j * ns.z);
          vec4 y_ = floor(j - 7.0 * x_);
          vec4 x  = x_ * ns.x + ns.yyyy;
          vec4 y  = y_ * ns.x + ns.yyyy;
          vec4 h  = 1.0 - abs(x) - abs(y);
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
          vec4 norm = taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
          p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
          vec4 m = max(0.6 - vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)), 0.0);
          m = m * m;
          return 42.0 * dot(m*m, vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
        }

        void main() {
          vec3 viewDir = normalize(vViewPosition);
          float fresnel = pow(1.0 - abs(dot(viewDir, vNormal)), 2.0);

          // Noise-based corona distortion
          float noise = snoise(vPosition * 3.0 + uTime * 0.4);
          noise = noise * 0.5 + 0.5; // remap 0–1
          float corona = pow(noise, 1.5) * fresnel;

          // Color gradient: cyan → blue → purple
          vec3 cyan   = vec3(0.0, 1.0, 0.9);
          vec3 blue   = vec3(0.1, 0.3, 1.0);
          vec3 purple = vec3(0.5, 0.0, 1.0);
          vec3 color  = mix(cyan, blue, corona);
          color       = mix(color, purple, fresnel * 0.5);

          gl_FragColor = vec4(color * corona, corona * 0.5);
        }
      `,
      uniforms: { uTime: { value: 0 } },
    });
    this.corona = new Mesh(geo, mat);
    this.coreGroup.add(this.corona);
  }

  // ── 3 orbit rings ────────────────────────────────────────────────────
  private createOrbitRings(): void {
    const rotations: [number, number, number][] = [
      [0.4, 0.2, 0],
      [-0.3, 0.5, 0.3],
      [0.1, -0.4, 0.6],
    ];
    const colors = [0x00f0ff, 0x00ffc4, 0x7b00ff];

    for (let i = 0; i < 3; i++) {
      const geo = new TorusGeometry(1.6 + i * 0.25, 0.008, 8, 128);
      const mat = new MeshBasicMaterial({
        color: colors[i],
        transparent: true,
        opacity: 0.35,
        blending: AdditiveBlending,
        depthWrite: false,
      });
      const ring = new Mesh(geo, mat);
      ring.rotation.set(...rotations[i]);
      this.coreGroup.add(ring);
      this.orbitRings.push(ring);
    }
  }

  // ── Star particles ───────────────────────────────────────────────────
  private createStars(): void {
    const count = 300;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 2.5 + Math.random() * 2.5;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
      sizes[i] = Math.random() * 3.0 + 0.5;
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
          gl_PointSize = aSize * (150.0 / -mvPos.z);
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
          gl_FragColor = vec4(vec3(1.0), alpha * twinkle * 0.8);
        }
      `,
      uniforms: { uTime: { value: 0 } },
    });

    this.stars = new Points(geo, mat);
    this.scene.add(this.stars);
  }

  // ── Pulse ring (triggered by triggerPulse()) ─────────────────────────
  private createPulseRing(): void {
    const geo = new RingGeometry(0.95, 1.05, 64);
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
        uniform float uStartTime;
        varying vec2 vUv;
        void main() {
          float elapsed = uTime - uStartTime;
          float expand = elapsed * 1.8;
          float alpha  = max(0.0, 1.0 - elapsed * 0.6);
          vec3 cyan = vec3(0.0, 1.0, 0.9);
          vec3 purple = vec3(0.5, 0.0, 1.0);
          vec3 color = mix(cyan, purple, elapsed * 0.3);
          gl_FragColor = vec4(color * 2.0, alpha * 0.8);
        }
      `,
      uniforms: {
        uTime: { value: 0 },
        uStartTime: { value: -10 },
      },
    });
    this.pulseRing = new Mesh(geo, mat);
    this.pulseRing.visible = false;
    this.coreGroup.add(this.pulseRing);
  }

  // ── Public API ───────────────────────────────────────────────────────
  triggerPulse(): void {
    this.pulseStartTime = this.clock.getElapsedTime();
    this.pulseActive = true;
    this.pulseRing.visible = true;
    this.pulseRing.scale.set(1, 1, 1);
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
    const targetRotY = this.scrollProgress * Math.PI * 2 + this.mouseX * 0.3;
    const targetRotX = this.mouseY * 0.2;
    this.currentRotX += (targetRotX - this.currentRotX) * 0.03;
    this.currentRotY += (targetRotY - this.currentRotY) * 0.03;
    this.coreGroup.rotation.x = this.currentRotX;
    this.coreGroup.rotation.y = this.currentRotY;

    // Slow idle rotation
    this.coreGroup.rotation.y += elapsed * 0.1;

    // Atmosphere gentle pulse
    const atmoPulse = 1.0 + Math.sin(elapsed * 1.5) * 0.02;
    this.atmosphere.scale.set(atmoPulse, atmoPulse, atmoPulse);

    // Corona rotation
    this.corona.rotation.y = elapsed * 0.15;
    this.corona.rotation.x = elapsed * 0.08;

    // Orbit ring rotation
    for (let i = 0; i < this.orbitRings.length; i++) {
      this.orbitRings[i].rotation.z += 0.001 * (i + 1);
    }

    // Pulse ring expansion
    if (this.pulseActive) {
      const pulseElapsed = elapsed - this.pulseStartTime;
      const scale = 1 + pulseElapsed * 1.8;
      this.pulseRing.scale.set(scale, scale, scale);
      if (pulseElapsed > 2.5) {
        this.pulseActive = false;
        this.pulseRing.visible = false;
      }
    }

    // Star rotation
    this.stars.rotation.y = elapsed * 0.02;

    // Update shader uniforms
    const coreMat = this.scene.children[0]
      ? (this.coreGroup.children[0] as Mesh).material as ShaderMaterial
      : null;
    if (coreMat && coreMat.uniforms) {
      coreMat.uniforms['uTime'].value = elapsed;
    }
    (this.corona.material as ShaderMaterial).uniforms['uTime'].value = elapsed;
    (this.stars.material as ShaderMaterial).uniforms['uTime'].value = elapsed;
    (this.pulseRing.material as ShaderMaterial).uniforms['uTime'].value = elapsed;
    (this.pulseRing.material as ShaderMaterial).uniforms['uStartTime'].value =
      this.pulseStartTime;

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

    this.coreGroup.traverse((child) => {
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

    this.stars.geometry.dispose();
    (this.stars.material as ShaderMaterial).dispose();

    this.renderer.dispose();
  }
}
