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
  CatmullRomCurve3,
  Line,
} from 'three';

/**
 * Wireframe Globe with Orbital Lines Scene
 * 
 * A wireframe sphere representing a planet, with glowing orbital trajectory lines
 * and small satellite dots tracing elliptical paths.
 */
export class GlobeOrbitScene {
  private scene!: Scene;
  private camera!: PerspectiveCamera;
  private renderer!: WebGLRenderer;
  private group!: Group;
  private clock!: Clock;
  private animationId: number | null = null;
  private resizeHandler!: () => void;
  private disposed = false;
  private satellites: { mesh: Points; curve: CatmullRomCurve3; speed: number; offset: number }[] = [];

  constructor(private canvas: HTMLCanvasElement) {
    this.clock = new Clock();
  }

  init(): void {
    this.initScene();
    this.bindEvents();
    this.animate();
  }

  private initScene(): void {
    this.scene = new Scene();

    this.camera = new PerspectiveCamera(45, 1, 0.1, 100);
    this.camera.position.z = 4;

    this.renderer = new WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);

    this.resizeRenderer();

    this.group = new Group();
    this.scene.add(this.group);

    this.createGlobe();
    this.createOrbits();
    this.createStarfield();
  }

  private createGlobe(): void {
    // Wireframe sphere
    const geometry = new SphereGeometry(1, 24, 24);
    const edges = new BufferGeometry().setFromPoints(
      this.getSphereEdges(geometry)
    );

    const material = new LineBasicMaterial({
      color: 0x00ffc4,
      transparent: true,
      opacity: 0.25,
    });

    const wireframe = new LineSegments(edges, material);
    this.group.add(wireframe);

    // Latitude lines
    const latitudes = [-0.6, -0.3, 0, 0.3, 0.6];
    latitudes.forEach(lat => {
      const points: Vector3[] = [];
      const r = Math.cos(lat) * 1.01;
      const y = Math.sin(lat) * 1.01;
      for (let i = 0; i <= 64; i++) {
        const theta = (i / 64) * Math.PI * 2;
        points.push(new Vector3(Math.cos(theta) * r, y, Math.sin(theta) * r));
      }
      const lineGeom = new BufferGeometry().setFromPoints(points);
      const lineMat = new LineBasicMaterial({ color: 0x00ffc4, transparent: true, opacity: 0.15 });
      const line = new Line(lineGeom, lineMat);
      this.group.add(line);
    });
  }

  private getSphereEdges(geometry: SphereGeometry): Vector3[] {
    const positions = geometry.getAttribute('position');
    const points: Vector3[] = [];
    
    // Simplified: just create random points on sphere surface
    for (let i = 0; i < positions.count; i += 3) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);
      points.push(new Vector3(x, y, z));
    }
    
    return points;
  }

  private createOrbits(): void {
    // Create 3 orbital paths with different inclinations
    const orbitConfigs = [
      { inclination: 0.3, radius: 1.5, color: 0x00f0ff },
      { inclination: -0.5, radius: 1.8, color: 0x00ffc4 },
      { inclination: 0.8, radius: 1.3, color: 0xb2a8ff },
    ];

    orbitConfigs.forEach(config => {
      // Create elliptical orbit curve
      const points: Vector3[] = [];
      for (let i = 0; i <= 100; i++) {
        const theta = (i / 100) * Math.PI * 2;
        const x = Math.cos(theta) * config.radius;
        const y = Math.sin(theta) * config.radius * Math.sin(config.inclination);
        const z = Math.sin(theta) * config.radius * Math.cos(config.inclination);
        points.push(new Vector3(x, y, z));
      }

      const curve = new CatmullRomCurve3(points, true);
      
      // Orbit line
      const lineGeom = new BufferGeometry().setFromPoints(curve.getPoints(100));
      const lineMat = new LineBasicMaterial({
        color: config.color,
        transparent: true,
        opacity: 0.2,
      });
      const orbitLine = new Line(lineGeom, lineMat);
      this.group.add(orbitLine);

      // Satellite (small glowing point)
      const satGeom = new BufferGeometry();
      satGeom.setAttribute('position', new Float32BufferAttribute([0, 0, 0], 3));
      const satMat = new PointsMaterial({
        color: config.color,
        size: 0.08,
        transparent: true,
        opacity: 0.9,
        blending: AdditiveBlending,
        sizeAttenuation: true,
      });
      const satellite = new Points(satGeom, satMat);
      this.group.add(satellite);

      this.satellites.push({
        mesh: satellite,
        curve,
        speed: 0.2 + Math.random() * 0.3,
        offset: Math.random() * Math.PI * 2,
      });
    });
  }

  private createStarfield(): void {
    const count = 200;
    const positions = new Float32Array(count * 3);
    
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20 - 5;
    }

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));

    const material = new PointsMaterial({
      color: 0xffffff,
      size: 0.02,
      transparent: true,
      opacity: 0.6,
      blending: AdditiveBlending,
    });

    const stars = new Points(geometry, material);
    this.scene.add(stars);
  }

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

  private animate(): void {
    this.animationId = requestAnimationFrame(() => this.animate());

    if (this.disposed) return;

    const elapsed = this.clock.getElapsedTime();

    // Rotate globe slowly
    this.group.rotation.y = elapsed * 0.15;
    this.group.rotation.x = Math.sin(elapsed * 0.1) * 0.1;

    // Animate satellites along orbits
    this.satellites.forEach(sat => {
      const t = ((elapsed * sat.speed + sat.offset) % (Math.PI * 2)) / (Math.PI * 2);
      const pos = sat.curve.getPoint(t);
      sat.mesh.position.copy(pos);
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
      this.animate();
    }
  }

  destroy(): void {
    this.disposed = true;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }
    window.removeEventListener('resize', this.resizeHandler);
    this.renderer.dispose();
  }
}
