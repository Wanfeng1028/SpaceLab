import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  SphereGeometry,
  BufferGeometry,
  Float32BufferAttribute,
  ShaderMaterial,
  Mesh,
  Points,
  Clock,
  Group,
  LineBasicMaterial,
  Line,
  Vector3,
  Color,
} from 'three';

interface OrbitalNode {
  label: string;
  position: [number, number, number];
  color: number;
  angle: number;
  radius: number;
}

/**
 * Orbital Learning Scene - Light Theme
 *
 * Knowledge star map with SpaceLab core at center,
 * orbiting nodes for STEM fields connected by constellation lines.
 * Optimized for light background.
 */
export class OrbitalLearningLightScene {
  private scene!: Scene;
  private camera!: PerspectiveCamera;
  private renderer!: WebGLRenderer;
  private clock!: Clock;
  private animationId: number | null = null;
  private resizeHandler!: () => void;
  private disposed = false;
  private contextLostHandler: ((e: Event) => void) | null = null;

  private starMapGroup!: Group;
  private core!: Mesh;
  private orbitalNodes: Mesh[] = [];
  private constellationLines: Line[] = [];
  private starField!: Points;

  private nodes: OrbitalNode[] = [
    { label: 'SCIENCE', position: [0, 0, 0], color: 0x69d7ff, angle: 0, radius: 2.0 },
    { label: 'TECHNOLOGY', position: [0, 0, 0], color: 0x56f0c2, angle: Math.PI * 0.5, radius: 2.2 },
    { label: 'ENGINEERING', position: [0, 0, 0], color: 0x8f7cff, angle: Math.PI, radius: 1.8 },
    { label: 'MATHEMATICS', position: [0, 0, 0], color: 0xffd21f, angle: Math.PI * 1.5, radius: 2.1 },
    { label: 'REMOTE SENSING', position: [0, 0, 0], color: 0x69d7ff, angle: Math.PI * 0.25, radius: 2.5 },
    { label: 'AI', position: [0, 0, 0], color: 0xa855f7, angle: Math.PI * 0.75, radius: 1.9 },
    { label: 'WEBGL', position: [0, 0, 0], color: 0x56f0c2, angle: Math.PI * 1.25, radius: 2.3 },
    { label: 'EDUCATION', position: [0, 0, 0], color: 0xffd21f, angle: Math.PI * 1.75, radius: 2.0 },
  ];

  private scrollProgress = 0;
  private mouseX = 0;
  private mouseY = 0;
  private targetRotX = 0;
  private targetRotY = 0;
  private currentRotX = 0;
  private currentRotY = 0;

  constructor(private canvas: HTMLCanvasElement) {
    this.clock = new Clock();
  }

  init(): void {
    this.initScene();
    this.createCore();
    this.createOrbitalNodes();
    this.createConstellationLines();
    this.createStarField();
    this.bindEvents();
    this.animate();
  }

  private initScene(): void {
    this.scene = new Scene();

    this.camera = new PerspectiveCamera(60, 1, 0.1, 100);
    this.camera.position.z = 6;

    this.renderer = new WebGLRenderer({
      canvas: this.canvas,
      antialias: false,
      alpha: true, // 透明背景
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.setClearColor(0x000000, 0); // 透明背景

    this.contextLostHandler = (e: Event) => {
      e.preventDefault();
    };
    this.renderer.domElement.addEventListener('webglcontextlost', this.contextLostHandler);

    this.resizeRenderer();

    this.starMapGroup = new Group();
    this.scene.add(this.starMapGroup);
  }

  // ── Central SpaceLab core ────────────────────────────────────────────
  private createCore(): void {
    const geo = new SphereGeometry(0.4, 32, 32);
    const mat = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
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
          float rim = pow(1.0 - abs(dot(viewDir, vNormal)), 2.0);
          float pulse = sin(uTime * 2.0) * 0.15 + 0.85;
          float intensity = (0.4 + rim * 0.6) * pulse;

          vec3 coreColor = vec3(0.1, 0.4, 0.6); // 深蓝色核心
          gl_FragColor = vec4(coreColor * intensity * 2.0, intensity * 0.9);
        }
      `,
      uniforms: { uTime: { value: 0 } },
    });
    this.core = new Mesh(geo, mat);
    this.starMapGroup.add(this.core);
  }

  // ── Orbital nodes for each knowledge area ────────────────────────────
  private createOrbitalNodes(): void {
    this.nodes.forEach((nodeData, i) => {
      // Create node sphere
      const geo = new SphereGeometry(0.15, 16, 16);
      const mat = new ShaderMaterial({
        transparent: true,
        depthWrite: false,
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
          uniform vec3 uColor;
          varying vec3 vNormal;
          varying vec3 vViewPosition;
          void main() {
            vec3 viewDir = normalize(vViewPosition);
            float rim = pow(1.0 - abs(dot(viewDir, vNormal)), 2.0);
            float pulse = sin(uTime * 3.0 + ${i.toFixed(1)}) * 0.2 + 0.8;
            float intensity = (0.5 + rim * 0.5) * pulse;
            gl_FragColor = vec4(uColor * intensity * 1.8, intensity * 0.8);
          }
        `,
        uniforms: {
          uTime: { value: 0 },
          uColor: { value: new Color(nodeData.color) },
        },
      });

      const node = new Mesh(geo, mat);

      // Position at orbital location
      const x = Math.cos(nodeData.angle) * nodeData.radius;
      const y = Math.sin(nodeData.angle * 0.3) * 0.5; // Slight tilt
      const z = Math.sin(nodeData.angle) * nodeData.radius;
      node.position.set(x, y, z);
      nodeData.position = [x, y, z];

      this.starMapGroup.add(node);
      this.orbitalNodes.push(node);
    });
  }

  // ── Constellation lines connecting nodes ─────────────────────────────
  private createConstellationLines(): void {
    // Connect nodes in a constellation pattern
    const connections = [
      [0, 1], [1, 2], [2, 3], [3, 0], // Inner ring
      [0, 4], [1, 5], [2, 6], [3, 7], // Outer connections
      [4, 5], [5, 6], [6, 7], [7, 4], // Outer ring
    ];

    connections.forEach(([a, b]) => {
      const nodeA = this.nodes[a];
      const nodeB = this.nodes[b];

      const points = [
        new Vector3(...nodeA.position),
        new Vector3(...nodeB.position),
      ];

      const geo = new BufferGeometry().setFromPoints(points);
      const mat = new LineBasicMaterial({
        color: 0x69d7ff, // 浅蓝色线
        transparent: true,
        opacity: 0.4,
      });

      const line = new Line(geo, mat);
      this.starMapGroup.add(line);
      this.constellationLines.push(line);
    });
  }

  // ── Background star field ────────────────────────────────────────────
  private createStarField(): void {
    const count = 200;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 5 + Math.random() * 5;
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
          gl_FragColor = vec4(vec3(0.3, 0.4, 0.5), alpha * twinkle * 0.4); // 灰蓝色星星
        }
      `,
      uniforms: { uTime: { value: 0 } },
    });

    this.starField = new Points(geo, mat);
    this.scene.add(this.starField);
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

    // Smooth rotation following mouse
    this.targetRotY = this.mouseX * 0.3;
    this.targetRotX = this.mouseY * 0.2;
    this.currentRotX += (this.targetRotX - this.currentRotX) * 0.05;
    this.currentRotY += (this.targetRotY - this.currentRotY) * 0.05;
    this.starMapGroup.rotation.x = this.currentRotX;
    this.starMapGroup.rotation.y = this.currentRotY + elapsed * 0.05;

    // Core pulse
    const corePulse = 1.0 + Math.sin(elapsed * 2.0) * 0.1;
    this.core.scale.set(corePulse, corePulse, corePulse);

    // Orbital node rotation (slow orbit)
    this.nodes.forEach((nodeData, i) => {
      nodeData.angle += 0.002;
      const x = Math.cos(nodeData.angle) * nodeData.radius;
      const y = Math.sin(nodeData.angle * 0.3 + i) * 0.5;
      const z = Math.sin(nodeData.angle) * nodeData.radius;
      this.orbitalNodes[i].position.set(x, y, z);
      nodeData.position = [x, y, z];
    });

    // Update constellation lines
    const connections = [
      [0, 1], [1, 2], [2, 3], [3, 0],
      [0, 4], [1, 5], [2, 6], [3, 7],
      [4, 5], [5, 6], [6, 7], [7, 4],
    ];

    connections.forEach(([a, b], i) => {
      const nodeA = this.nodes[a];
      const nodeB = this.nodes[b];
      const positions = this.constellationLines[i].geometry.getAttribute('position');
      positions.setXYZ(0, ...nodeA.position);
      positions.setXYZ(1, ...nodeB.position);
      positions.needsUpdate = true;
    });

    // Update shader uniforms
    (this.core.material as ShaderMaterial).uniforms['uTime'].value = elapsed;
    this.orbitalNodes.forEach((node) => {
      (node.material as ShaderMaterial).uniforms['uTime'].value = elapsed;
    });
    (this.starField.material as ShaderMaterial).uniforms['uTime'].value = elapsed;

    // Pulse constellation lines
    this.constellationLines.forEach((line, i) => {
      const pulse = Math.sin(elapsed * 2.0 + i * 0.5) * 0.15 + 0.4;
      (line.material as LineBasicMaterial).opacity = pulse;
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

    this.starMapGroup.traverse((child) => {
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

    this.starField.geometry.dispose();
    (this.starField.material as ShaderMaterial).dispose();

    this.renderer.dispose();
  }
}