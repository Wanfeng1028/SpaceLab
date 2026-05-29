import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  SphereGeometry,
  LineBasicMaterial,
  LineSegments,
  BufferGeometry,
  Float32BufferAttribute,
  Points,
  PointsMaterial,
  Group,
  Clock,
  AdditiveBlending,
  Color,
  Vector3,
  QuadraticBezierCurve3,
  Line,
  Mesh,
  ShaderMaterial,
  BackSide,
} from 'three';

const DEG = Math.PI / 180;

function latLngToVec3(lat: number, lng: number, r: number): Vector3 {
  const phi = (90 - lat) * DEG;
  const theta = (lng + 180) * DEG;
  return new Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta),
  );
}

interface ArcDef {
  from: [number, number];
  to: [number, number];
  color: number;
}

const ARC_DEFS: ArcDef[] = [
  { from: [39.9, 116.4], to: [35.7, 139.7], color: 0x00f0ff },
  { from: [39.9, 116.4], to: [1.3, 103.8], color: 0x69d7ff },
  { from: [35.7, 139.7], to: [37.8, -122.4], color: 0x00f0ff },
  { from: [37.8, -122.4], to: [40.7, -74.0], color: 0x69d7ff },
  { from: [40.7, -74.0], to: [51.5, -0.1], color: 0x8f7cff },
  { from: [51.5, -0.1], to: [55.8, 37.6], color: 0x69d7ff },
  { from: [55.8, 37.6], to: [39.9, 116.4], color: 0x00f0ff },
  { from: [25.2, 55.3], to: [19.1, 72.9], color: 0x8f7cff },
  { from: [19.1, 72.9], to: [1.3, 103.8], color: 0x69d7ff },
  { from: [1.3, 103.8], to: [-33.9, 151.2], color: 0x00f0ff },
  { from: [-23.5, -46.6], to: [40.7, -74.0], color: 0x8f7cff },
  { from: [30.0, 31.2], to: [25.2, 55.3], color: 0x69d7ff },
  { from: [51.5, -0.1], to: [30.0, 31.2], color: 0x00f0ff },
  { from: [-33.9, 151.2], to: [35.7, 139.7], color: 0x8f7cff },
];

const CITY_COORDS: [number, number][] = [
  [39.9, 116.4],
  [35.7, 139.7],
  [1.3, 103.8],
  [37.8, -122.4],
  [40.7, -74.0],
  [51.5, -0.1],
  [55.8, 37.6],
  [25.2, 55.3],
  [19.1, 72.9],
  [-33.9, 151.2],
  [-23.5, -46.6],
  [30.0, 31.2],
];

export class EarthSignalScene {
  private scene!: Scene;
  private camera!: PerspectiveCamera;
  private renderer!: WebGLRenderer;
  private globeGroup!: Group;
  private clock!: Clock;
  private animationId: number | null = null;
  private resizeHandler!: () => void;
  private disposed = false;
  private contextLostHandler: ((e: Event) => void) | null = null;

  private arcCurves: QuadraticBezierCurve3[] = [];
  private arcFlowPoints: Points[] = [];
  private dustPoints: Points | null = null;
  private starfield: Points | null = null;

  private readonly isMobile: boolean;
  private readonly prefersReducedMotion: boolean;
  private readonly GLOBE_RADIUS = 2.1;

  constructor(private canvas: HTMLCanvasElement) {
    this.isMobile = window.innerWidth < 768;
    this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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
    this.camera.position.set(0, 0.2, 7.2);

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

    this.globeGroup = new Group();
    this.scene.add(this.globeGroup);

    this.createGlobeWireframe();
    this.createCityLights();
    this.createAtmosphere();
    this.createArcs();
    this.createStarField();
    this.createDust();
  }

  private createGlobeWireframe(): void {
    const R = this.GLOBE_RADIUS;

    // Main wireframe sphere
    const sphereGeom = new SphereGeometry(R, 36, 24);
    const wireMat = new LineBasicMaterial({ color: 0x69d7ff, transparent: true, opacity: 0.12 });
    const wireframe = new LineSegments(new WireframeGeometryHelper(sphereGeom), wireMat);
    this.globeGroup.add(wireframe);
    sphereGeom.dispose();

    // Latitude lines
    const latitudes = [-60, -40, -20, 0, 20, 40, 60];
    latitudes.forEach((lat) => {
      const pts: Vector3[] = [];
      const phi = (90 - lat) * DEG;
      const r = Math.sin(phi) * R * 1.001;
      const y = Math.cos(phi) * R * 1.001;
      for (let i = 0; i <= 72; i++) {
        const theta = (i / 72) * Math.PI * 2;
        pts.push(new Vector3(Math.cos(theta) * r, y, Math.sin(theta) * r));
      }
      const geom = new BufferGeometry().setFromPoints(pts);
      const mat = new LineBasicMaterial({ color: 0x69d7ff, transparent: true, opacity: 0.08 });
      this.globeGroup.add(new Line(geom, mat));
    });

    // Longitude lines
    for (let lng = 0; lng < 360; lng += 30) {
      const pts: Vector3[] = [];
      for (let i = 0; i <= 72; i++) {
        const lat = -90 + (i / 72) * 180;
        pts.push(latLngToVec3(lat, lng, R * 1.001));
      }
      const geom = new BufferGeometry().setFromPoints(pts);
      const mat = new LineBasicMaterial({ color: 0x69d7ff, transparent: true, opacity: 0.06 });
      this.globeGroup.add(new Line(geom, mat));
    }
  }

  private createCityLights(): void {
    const count = CITY_COORDS.length;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    CITY_COORDS.forEach(([lat, lng], i) => {
      const v = latLngToVec3(lat, lng, this.GLOBE_RADIUS * 1.005);
      positions[i * 3] = v.x;
      positions[i * 3 + 1] = v.y;
      positions[i * 3 + 2] = v.z;
      sizes[i] = this.isMobile ? 6.0 : 8.0;
    });

    const geom = new BufferGeometry();
    geom.setAttribute('position', new Float32BufferAttribute(positions, 3));
    geom.setAttribute('size', new Float32BufferAttribute(sizes, 1));

    const mat = new ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: `
        attribute float size;
        varying float vSize;
        void main() {
          vSize = size;
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mvPos.z);
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying float vSize;
        void main() {
          float d = length(gl_PointCoord - 0.5) * 2.0;
          float alpha = smoothstep(1.0, 0.2, d);
          float pulse = 0.7 + 0.3 * sin(uTime * 2.0 + vSize * 10.0);
          gl_FragColor = vec4(0.6, 0.92, 1.0, alpha * pulse * 0.9);
        }
      `,
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
    });

    this.globeGroup.add(new Points(geom, mat));
  }

  private createAtmosphere(): void {
    const R = this.GLOBE_RADIUS;
    const atmRadius = R * 1.14;
    const geom = new SphereGeometry(atmRadius, 48, 32);

    const mat = new ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vWorldPos;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uGlowColor;
        uniform float uIntensity;
        uniform float uPower;
        varying vec3 vNormal;
        varying vec3 vWorldPos;
        void main() {
          vec3 viewDir = normalize(cameraPosition - vWorldPos);
          float fresnel = pow(1.0 + dot(viewDir, vNormal), uPower);
          gl_FragColor = vec4(uGlowColor, fresnel * uIntensity);
        }
      `,
      uniforms: {
        uGlowColor: { value: new Color(0x4ab8ff) },
        uIntensity: { value: 0.9 },
        uPower: { value: 3.0 },
      },
      side: BackSide,
      blending: AdditiveBlending,
      transparent: true,
      depthWrite: false,
    });

    this.globeGroup.add(new Mesh(geom, mat));
  }

  private createArcs(): void {
    const R = this.GLOBE_RADIUS;
    const arcCount = this.isMobile ? 7 : ARC_DEFS.length;

    // Arc lines
    ARC_DEFS.slice(0, arcCount).forEach((def) => {
      const start = latLngToVec3(def.from[0], def.from[1], R * 1.005);
      const end = latLngToVec3(def.to[0], def.to[1], R * 1.005);
      const mid = start.clone().add(end).multiplyScalar(0.5);
      const dist = start.distanceTo(end);
      const control = mid.normalize().multiplyScalar(R + dist * 0.45);

      const curve = new QuadraticBezierCurve3(start, control, end);
      this.arcCurves.push(curve);

      const pts = curve.getPoints(50);
      const lineGeom = new BufferGeometry().setFromPoints(pts);
      const lineMat = new LineBasicMaterial({
        color: def.color,
        transparent: true,
        opacity: 0.3,
      });
      this.globeGroup.add(new Line(lineGeom, lineMat));

      // Flowing light point
      const dotGeom = new BufferGeometry();
      dotGeom.setAttribute('position', new Float32BufferAttribute([0, 0, 0], 3));
      const dotMat = new PointsMaterial({
        color: def.color,
        size: this.isMobile ? 0.06 : 0.08,
        transparent: true,
        opacity: 0.95,
        blending: AdditiveBlending,
        sizeAttenuation: true,
        depthWrite: false,
      });
      const dot = new Points(dotGeom, dotMat);
      this.globeGroup.add(dot);
      this.arcFlowPoints.push(dot);
    });
  }

  private createStarField(): void {
    const count = this.isMobile ? 600 : 1200;
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 60;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 60;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 60 - 10;
    }

    const geom = new BufferGeometry();
    geom.setAttribute('position', new Float32BufferAttribute(positions, 3));

    const mat = new PointsMaterial({
      color: 0xffffff,
      size: 0.025,
      transparent: true,
      opacity: 0.6,
      blending: AdditiveBlending,
      depthWrite: false,
    });

    this.starfield = new Points(geom, mat);
    this.scene.add(this.starfield);
  }

  private createDust(): void {
    const count = this.isMobile ? 400 : 800;
    const R = this.GLOBE_RADIUS;
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const r = R * (1.2 + Math.random() * 1.8);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
    }

    const geom = new BufferGeometry();
    geom.setAttribute('position', new Float32BufferAttribute(positions, 3));

    const mat = new PointsMaterial({
      color: 0x88aaff,
      size: 0.015,
      transparent: true,
      opacity: 0.25,
      blending: AdditiveBlending,
      depthWrite: false,
    });

    this.dustPoints = new Points(geom, mat);
    this.scene.add(this.dustPoints);
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
    const speedFactor = this.prefersReducedMotion ? 0.05 : 1.0;

    // Globe rotation
    this.globeGroup.rotation.y = elapsed * 0.08 * speedFactor;

    // Flowing arc points
    this.arcCurves.forEach((curve, i) => {
      if (i < this.arcFlowPoints.length) {
        const t = (((elapsed * 0.15 * speedFactor + i * 0.07) % 1) + 1) % 1;
        const pos = curve.getPoint(t);
        this.arcFlowPoints[i].position.copy(pos);
      }
    });

    // Dust gentle drift
    if (this.dustPoints) {
      this.dustPoints.rotation.y = elapsed * 0.02 * speedFactor;
      this.dustPoints.rotation.x = Math.sin(elapsed * 0.01 * speedFactor) * 0.05;
    }

    // Update city light shader time
    this.globeGroup.traverse((obj) => {
      const mesh = obj as any;
      if (mesh.material?.uniforms?.uTime) {
        mesh.material.uniforms.uTime.value = elapsed;
      }
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
    this.arcCurves = [];
    this.arcFlowPoints = [];
    this.dustPoints = null;
    this.starfield = null;
  }
}

/** Three.js WireframeGeometry replacement — extracts edges from a BufferGeometry */
class WireframeGeometryHelper extends BufferGeometry {
  constructor(geometry: BufferGeometry) {
    super();
    const edges = new Set<string>();
    const pos = geometry.getAttribute('position');
    const idx = geometry.getIndex();
    const vertices: number[] = [];

    const addEdge = (a: number, b: number) => {
      const key = a < b ? `${a}_${b}` : `${b}_${a}`;
      if (edges.has(key)) return;
      edges.add(key);
      vertices.push(pos.getX(a), pos.getY(a), pos.getZ(a));
      vertices.push(pos.getX(b), pos.getY(b), pos.getZ(b));
    };

    if (idx) {
      for (let i = 0; i < idx.count; i += 3) {
        const a = idx.getX(i),
          b = idx.getX(i + 1),
          c = idx.getX(i + 2);
        addEdge(a, b);
        addEdge(b, c);
        addEdge(c, a);
      }
    } else {
      for (let i = 0; i < pos.count; i += 3) {
        addEdge(i, i + 1);
        addEdge(i + 1, i + 2);
        addEdge(i + 2, i);
      }
    }

    this.setAttribute('position', new Float32BufferAttribute(vertices, 3));
  }
}
