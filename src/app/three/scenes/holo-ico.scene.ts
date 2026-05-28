import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  IcosahedronGeometry,
  ShaderMaterial,
  Mesh,
  Clock,
  AdditiveBlending,
  Color,
} from 'three';

/**
 * Holographic Icosahedron Scene
 *
 * A slowly rotating wireframe icosahedron with Fresnel edge glow and scanline shader.
 * Fits the "diagnostics" theme perfectly — looks like a holographic heads-up display projection.
 */
export class HoloIcoScene {
  private scene!: Scene;
  private camera!: PerspectiveCamera;
  private renderer!: WebGLRenderer;
  private mesh!: Mesh;
  private clock!: Clock;
  private animationId: number | null = null;
  private resizeHandler!: () => void;
  private disposed = false;
  private contextLostHandler: ((e: Event) => void) | null = null;

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
    this.camera.position.z = 3;

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
    this.createIcosahedron();
  }

  private createIcosahedron(): void {
    const geometry = new IcosahedronGeometry(1, 1);

    const vertexShader = `
      varying vec3 vNormal;
      varying vec3 vViewPosition;
      varying vec2 vUv;
      varying float vY;

      void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vViewPosition = -mvPosition.xyz;
        vY = position.y;
        gl_Position = projectionMatrix * mvPosition;
      }
    `;

    const fragmentShader = `
      precision highp float;

      uniform float uTime;
      uniform vec3 uColor;
      uniform vec3 uScanColor;

      varying vec3 vNormal;
      varying vec3 vViewPosition;
      varying vec2 vUv;
      varying float vY;

      void main() {
        // Fresnel rim glow
        vec3 viewDir = normalize(vViewPosition);
        float fresnel = pow(1.0 - abs(dot(viewDir, vNormal)), 2.5);

        // Scanlines
        float scanline = sin(vY * 20.0 + uTime * 2.0) * 0.5 + 0.5;
        scanline = pow(scanline, 8.0) * 0.6;

        // Combine
        vec3 color = mix(uColor * 0.3, uColor, fresnel);
        color += uScanColor * scanline * fresnel;

        // Edge glow
        float edge = fresnel * 1.2;
        
        gl_FragColor = vec4(color, edge + 0.15);
      }
    `;

    const material = new ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new Color(0x00ffc4) },
        uScanColor: { value: new Color(0x00f0ff) },
      },
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
      wireframe: true,
    });

    this.mesh = new Mesh(geometry, material);
    this.scene.add(this.mesh);
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

    // Rotate slowly
    this.mesh.rotation.x = elapsed * 0.3;
    this.mesh.rotation.y = elapsed * 0.5;

    // Update shader time
    (this.mesh.material as ShaderMaterial).uniforms['uTime'].value = elapsed;

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
    if (this.contextLostHandler) {
      this.renderer.domElement.removeEventListener('webglcontextlost', this.contextLostHandler);
      this.contextLostHandler = null;
    }
    this.disposed = true;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }
    window.removeEventListener('resize', this.resizeHandler);
    this.renderer.dispose();
    this.mesh.geometry.dispose();
    (this.mesh.material as ShaderMaterial).dispose();
  }
}
