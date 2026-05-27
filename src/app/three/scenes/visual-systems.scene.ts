import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  PlaneGeometry,
  BufferGeometry,
  Float32BufferAttribute,
  ShaderMaterial,
  Mesh,
  Group,
  Clock,
  AdditiveBlending,
  DoubleSide,
} from 'three';

/**
 * Visual Systems Scene
 *
 * Holographic data visualization panels with abstract graphics:
 * contour lines, point clouds, neural nodes, waveforms, orbits, heatmaps, etc.
 */
export class VisualSystemsScene {
  private scene!: Scene;
  private camera!: PerspectiveCamera;
  private renderer!: WebGLRenderer;
  private clock!: Clock;
  private animationId: number | null = null;
  private resizeHandler!: () => void;
  private disposed = false;
  private contextLostHandler: ((e: Event) => void) | null = null;

  private panelsGroup!: Group;
  private panels: Mesh[] = [];
  private panelData: { type: number; mesh: Mesh }[] = [];

  private scrollProgress = 0;
  private mouseX = 0;
  private mouseY = 0;
  private targetRotY = 0;
  private currentRotY = 0;
  private isDragging = false;
  private dragStartX = 0;
  private dragRotation = 0;

  constructor(private canvas: HTMLCanvasElement) {
    this.clock = new Clock();
  }

  init(): void {
    this.initScene();
    this.createPanels();
    this.bindEvents();
    this.animate();
  }

  private initScene(): void {
    this.scene = new Scene();

    this.camera = new PerspectiveCamera(50, 1, 0.1, 100);
    this.camera.position.z = 8;

    this.renderer = new WebGLRenderer({
      canvas: this.canvas,
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.setClearColor(0x000000, 1);

    this.contextLostHandler = (e: Event) => {
      e.preventDefault();
    };
    this.renderer.domElement.addEventListener('webglcontextlost', this.contextLostHandler);

    this.resizeRenderer();

    this.panelsGroup = new Group();
    this.scene.add(this.panelsGroup);
  }

  // ── Create 8 holographic data panels ─────────────────────────────────
  private createPanels(): void {
    const panelTypes = [
      'contours',      // 地形等高线
      'pointcloud',    // 点云
      'neural',        // 神经网络节点
      'waveform',      // 波形图
      'orbit',         // 轨道图
      'heatmap',       // 热力网格
      'scatter',       // 散点图
      'timeseries',    // 时间序列
    ];

    const panelCount = panelTypes.length;
    const arcRadius = 5;
    const arcAngle = Math.PI * 0.6;
    const startAngle = -arcAngle / 2;

    for (let i = 0; i < panelCount; i++) {
      const angle = startAngle + (arcAngle / (panelCount - 1)) * i;
      const x = Math.sin(angle) * arcRadius;
      const z = -Math.cos(angle) * arcRadius + arcRadius;
      const y = 0;

      const panel = this.createPanel(panelTypes[i], i);
      panel.position.set(x, y, z);
      panel.rotation.y = angle;

      this.panelsGroup.add(panel);
      this.panels.push(panel);
      this.panelData.push({ type: i, mesh: panel });
    }
  }

  // ── Create individual panel with data visualization ──────────────────
  private createPanel(type: string, index: number): Mesh {
    const width = 3.6; // Increased from 1.8 to 3.6 (2x)
    const height = 2.8; // Increased from 1.4 to 2.8 (2x)
    const geo = new PlaneGeometry(width, height, 32, 32);

    const mat = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      side: DoubleSide,
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vPosition;
        uniform float uTime;
        uniform float uHover;

        void main() {
          vUv = uv;
          vPosition = position;
          
          // Hover effect - slight scale
          vec3 pos = position;
          pos.z += uHover * 0.1;
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: this.getFragmentShader(type),
      uniforms: {
        uTime: { value: 0 },
        uHover: { value: 0 },
        uType: { value: this.getTypeIndex(type) },
      },
    });

    return new Mesh(geo, mat);
  }

  private getTypeIndex(type: string): number {
    const types = ['contours', 'pointcloud', 'neural', 'waveform', 'orbit', 'heatmap', 'scatter', 'timeseries'];
    return types.indexOf(type);
  }

  private getFragmentShader(type: string): string {
    return `
      precision highp float;
      varying vec2 vUv;
      varying vec3 vPosition;
      uniform float uTime;
      uniform float uHover;
      uniform float uType;

      // Noise functions
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
        vec2 uv = vUv;
        vec3 color = vec3(0.0);
        float alpha = 0.0;

        // Panel border
        float border = 0.02;
        float borderAlpha = 0.0;
        if (uv.x < border || uv.x > 1.0 - border || uv.y < border || uv.y > 1.0 - border) {
          borderAlpha = 0.8;
        }

        // Background glow
        float bgGlow = 0.1 + uHover * 0.15;

        // Different visualization based on type
        float type = uType;

        if (type < 0.5) {
          // Contours (地形等高线)
          float n = noise(uv * 8.0 + uTime * 0.1);
          float contour = fract(n * 5.0);
          contour = smoothstep(0.0, 0.05, contour) * smoothstep(0.1, 0.05, contour);
          color = vec3(0.0, 0.9, 0.7) * contour;
          alpha = contour * 0.8;
        } else if (type < 1.5) {
          // Point cloud (点云)
          vec2 grid = fract(uv * 12.0);
          float point = length(grid - 0.5);
          point = smoothstep(0.3, 0.1, point);
          float pointAlpha = hash(floor(uv * 12.0) + floor(uTime));
          color = vec3(0.0, 1.0, 0.8) * point * pointAlpha;
          alpha = point * pointAlpha * 0.9;
        } else if (type < 2.5) {
          // Neural nodes (神经网络节点)
          vec2 grid = floor(uv * 6.0);
          vec2 cellUv = fract(uv * 6.0);
          float node = length(cellUv - 0.5);
          float nodeAlpha = hash(grid + floor(uTime * 0.5));
          node = smoothstep(0.4, 0.1, node) * nodeAlpha;
          // Connection lines
          float line = 0.0;
          if (abs(cellUv.x - 0.5) < 0.02 || abs(cellUv.y - 0.5) < 0.02) {
            line = 0.3 * nodeAlpha;
          }
          color = vec3(0.5, 0.0, 1.0) * (node + line);
          alpha = (node + line) * 0.8;
        } else if (type < 3.5) {
          // Waveform (波形图)
          float wave = sin(uv.x * 20.0 + uTime * 2.0) * 0.3;
          wave += sin(uv.x * 10.0 - uTime) * 0.2;
          float line = smoothstep(0.05, 0.0, abs(uv.y - 0.5 - wave));
          color = vec3(0.0, 0.8, 1.0) * line;
          alpha = line * 0.9;
        } else if (type < 4.5) {
          // Orbit (轨道图)
          float dist = length(uv - 0.5);
          float orbit1 = smoothstep(0.02, 0.0, abs(dist - 0.3));
          float orbit2 = smoothstep(0.02, 0.0, abs(dist - 0.45));
          float angle = atan(uv.y - 0.5, uv.x - 0.5);
          float satellite1 = smoothstep(0.05, 0.0, length(uv - (vec2(cos(uTime), sin(uTime)) * 0.3 + 0.5)));
          float satellite2 = smoothstep(0.05, 0.0, length(uv - (vec2(cos(uTime * 0.7 + 2.0), sin(uTime * 0.7 + 2.0)) * 0.45 + 0.5)));
          color = vec3(0.7, 0.0, 1.0) * (orbit1 + orbit2) + vec3(1.0) * (satellite1 + satellite2);
          alpha = (orbit1 + orbit2 + satellite1 + satellite2) * 0.8;
        } else if (type < 5.5) {
          // Heatmap (热力网格)
          vec2 grid = floor(uv * 10.0);
          float heat = noise(grid + floor(uTime * 0.3));
          heat = pow(heat, 1.5);
          vec3 heatColor = mix(vec3(0.0, 0.0, 0.5), vec3(1.0, 0.3, 0.0), heat);
          heatColor = mix(heatColor, vec3(1.0, 1.0, 0.0), heat * heat);
          color = heatColor * 0.7;
          alpha = 0.7;
        } else if (type < 6.5) {
          // Scatter (散点图)
          float scatter = 0.0;
          for (int i = 0; i < 20; i++) {
            vec2 point = vec2(
              hash(vec2(float(i), 0.0)),
              hash(vec2(0.0, float(i)))
            );
            float d = length(uv - point);
            scatter += smoothstep(0.05, 0.0, d);
          }
          color = vec3(0.0, 1.0, 0.5) * scatter;
          alpha = scatter * 0.6;
        } else {
          // Time series (时间序列)
          float series1 = sin(uv.x * 15.0 + uTime) * 0.2 + 0.5;
          float series2 = sin(uv.x * 10.0 - uTime * 0.7 + 1.0) * 0.25 + 0.5;
          float series3 = sin(uv.x * 20.0 + uTime * 1.5 + 2.0) * 0.15 + 0.5;
          float line1 = smoothstep(0.03, 0.0, abs(uv.y - series1));
          float line2 = smoothstep(0.03, 0.0, abs(uv.y - series2));
          float line3 = smoothstep(0.03, 0.0, abs(uv.y - series3));
          color = vec3(1.0, 0.0, 0.5) * line1 + vec3(0.0, 1.0, 0.8) * line2 + vec3(0.5, 0.0, 1.0) * line3;
          alpha = (line1 + line2 + line3) * 0.8;
        }

        // Add border
        color += vec3(0.0, 0.8, 1.0) * borderAlpha;
        alpha = max(alpha, borderAlpha);

        // Background
        color += vec3(0.0, 0.1, 0.15) * bgGlow;
        alpha = max(alpha, bgGlow);

        // Edge fade
        float edgeFade = smoothstep(0.0, 0.1, uv.x) * smoothstep(1.0, 0.9, uv.x) *
                         smoothstep(0.0, 0.1, uv.y) * smoothstep(1.0, 0.9, uv.y);
        alpha *= edgeFade;

        gl_FragColor = vec4(color, alpha * 0.9);
      }
    `;
  }

  // ── Public API ───────────────────────────────────────────────────────
  updateScroll(progress: number): void {
    this.scrollProgress = progress;
  }

  updateMouse(nx: number, ny: number): void {
    this.mouseX = nx;
    this.mouseY = ny;
  }

  setHover(index: number, isHovered: boolean): void {
    if (this.panelData[index]) {
      const mat = this.panelData[index].mesh.material as ShaderMaterial;
      mat.uniforms['uHover'].value = isHovered ? 1.0 : 0.0;
    }
  }

  startDrag(x: number): void {
    this.isDragging = true;
    this.dragStartX = x;
    this.dragRotation = this.panelsGroup.rotation.y;
  }

  updateDrag(x: number): void {
    if (!this.isDragging) return;
    const deltaX = x - this.dragStartX;
    this.panelsGroup.rotation.y = this.dragRotation + deltaX * 0.5;
    // Clamp rotation
    this.panelsGroup.rotation.y = Math.max(-0.5, Math.min(0.5, this.panelsGroup.rotation.y));
  }

  endDrag(): void {
    this.isDragging = false;
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

    // Smooth rotation following mouse (only when not dragging)
    if (!this.isDragging) {
      this.targetRotY = this.mouseX * 0.2;
      this.currentRotY += (this.targetRotY - this.currentRotY) * 0.05;
      this.panelsGroup.rotation.y = this.currentRotY;
    }

    // Update shader uniforms
    this.panelData.forEach((data) => {
      const mat = data.mesh.material as ShaderMaterial;
      mat.uniforms['uTime'].value = elapsed;
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

    this.panelsGroup.traverse((child) => {
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
