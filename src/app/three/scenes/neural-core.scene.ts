import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  SphereGeometry,
  BufferGeometry,
  Float32BufferAttribute,
  ShaderMaterial,
  Mesh,
  Material,
  Points,
  Clock,
  AdditiveBlending,
  Group,
  LineBasicMaterial,
  Line,
  Vector3,
} from 'three';

/**
 * Neural Core Scene
 *
 * 3D neural network with central core, 120-250 nodes,
 * connection lines, and floating token characters.
 */
export class NeuralCoreScene {
  private scene!: Scene;
  private camera!: PerspectiveCamera;
  private renderer!: WebGLRenderer;
  private clock!: Clock;
  private animationId: number | null = null;
  private resizeHandler!: () => void;
  private disposed = false;

  private networkGroup!: Group;
  private core!: Mesh;
  private nodes!: Points;
  private connections: Line[] = [];
  private tokenParticles!: Points;

  private nodeCount: number;
  private nodePositions: Float32Array = new Float32Array(0);

  private scrollProgress = 0;
  private mouseX = 0;
  private mouseY = 0;
  private targetRotX = 0;
  private targetRotY = 0;
  private currentRotX = 0;
  private currentRotY = 0;

  private assemblyProgress = 0;
  private isAssembling = false;

  constructor(private canvas: HTMLCanvasElement) {
    this.clock = new Clock();
    const isMobile =
      /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      ) || window.innerWidth < 768;
    this.nodeCount = isMobile ? 120 : 200;
  }

  init(): void {
    this.initScene();
    this.createCore();
    this.createNodes();
    this.createConnections();
    this.createTokenParticles();
    this.bindEvents();
    this.animate();
  }

  private initScene(): void {
    this.scene = new Scene();

    this.camera = new PerspectiveCamera(60, 1, 0.1, 100);
    this.camera.position.z = 5;

    this.renderer = new WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);

    this.resizeRenderer();

    this.networkGroup = new Group();
    this.scene.add(this.networkGroup);
  }

  // ── Central glowing core ─────────────────────────────────────────────
  private createCore(): void {
    const geo = new SphereGeometry(0.3, 32, 32);
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
          float rim = pow(1.0 - abs(dot(viewDir, vNormal)), 2.0);
          float pulse = sin(uTime * 3.0) * 0.2 + 0.8;
          float intensity = (0.3 + rim * 0.7) * pulse;
          
          vec3 cyan = vec3(0.0, 1.0, 1.0);
          vec3 purple = vec3(0.6, 0.0, 1.0);
          vec3 color = mix(cyan, purple, rim);
          
          gl_FragColor = vec4(color * intensity * 2.0, intensity);
        }
      `,
      uniforms: { uTime: { value: 0 } },
    });
    this.core = new Mesh(geo, mat);
    this.networkGroup.add(this.core);
  }

  // ── Neural nodes ─────────────────────────────────────────────────────
  private createNodes(): void {
    const count = this.nodeCount;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const colors = new Float32Array(count * 3);
    const randoms = new Float32Array(count);

    this.nodePositions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      // Random spherical distribution
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 1.0 + Math.random() * 1.5;

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      // Store final positions for assembly animation
      this.nodePositions[i * 3] = positions[i * 3];
      this.nodePositions[i * 3 + 1] = positions[i * 3 + 1];
      this.nodePositions[i * 3 + 2] = positions[i * 3 + 2];

      // Random initial positions for scattered state
      positions[i * 3] = (Math.random() - 0.5) * 8;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 8;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 8;

      sizes[i] = Math.random() * 3 + 1;
      randoms[i] = Math.random();

      // Color variation: cyan to purple
      const t = Math.random();
      colors[i * 3] = t * 0.6;
      colors[i * 3 + 1] = 1.0 - t * 0.8;
      colors[i * 3 + 2] = 0.8 + t * 0.2;
    }

    const geo = new BufferGeometry();
    geo.setAttribute('position', new Float32BufferAttribute(positions, 3));
    geo.setAttribute('aSize', new Float32BufferAttribute(sizes, 1));
    geo.setAttribute('aColor', new Float32BufferAttribute(colors, 3));
    geo.setAttribute('aRandom', new Float32BufferAttribute(randoms, 1));

    const mat = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      vertexShader: `
        attribute float aSize;
        attribute vec3 aColor;
        attribute float aRandom;
        uniform float uTime;
        uniform float uAssembly;
        varying vec3 vColor;
        varying float vAlpha;

        void main() {
          vColor = aColor;
          
          // Assembly animation: scatter → converge
          vec3 finalPos = position;
          if (uAssembly < 1.0) {
            // Interpolate from scattered to organized
            // This would need stored original positions
            float progress = uAssembly;
            vAlpha = 0.3 + progress * 0.7;
          } else {
            vAlpha = 0.8;
          }
          
          // Pulse effect
          float pulse = sin(uTime * 2.0 + aRandom * 6.28) * 0.2 + 0.8;
          
          vec4 mvPos = modelViewMatrix * vec4(finalPos, 1.0);
          gl_PointSize = aSize * pulse * (120.0 / -mvPos.z);
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        precision highp float;
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          if (d > 0.5) discard;
          float alpha = smoothstep(0.5, 0.0, d) * vAlpha;
          gl_FragColor = vec4(vColor * 1.5, alpha);
        }
      `,
      uniforms: {
        uTime: { value: 0 },
        uAssembly: { value: 0 },
      },
    });

    this.nodes = new Points(geo, mat);
    this.networkGroup.add(this.nodes);
  }

  // ── Connection lines between nodes ───────────────────────────────────
  private createConnections(): void {
    // Connect nearby nodes
    const positions = this.nodes.geometry.getAttribute('position').array;
    const count = this.nodeCount;
    const maxConnections = 300;
    let connectionCount = 0;

    for (let i = 0; i < count && connectionCount < maxConnections; i++) {
      for (let j = i + 1; j < count && connectionCount < maxConnections; j++) {
        const dx = positions[i * 3] - positions[j * 3];
        const dy = positions[i * 3 + 1] - positions[j * 3 + 1];
        const dz = positions[i * 3 + 2] - positions[j * 3 + 2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        // Connect if distance is small enough
        if (dist < 0.8) {
          const points = [
            new Vector3(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]),
            new Vector3(positions[j * 3], positions[j * 3 + 1], positions[j * 3 + 2]),
          ];
          const geo = new BufferGeometry().setFromPoints(points);
          const mat = new LineBasicMaterial({
            color: 0x00f0ff,
            transparent: true,
            opacity: 0.3,
            blending: AdditiveBlending,
          });
          const line = new Line(geo, mat);
          this.networkGroup.add(line);
          this.connections.push(line);
          connectionCount++;
        }
      }
    }
  }

  // ── Token character particles ────────────────────────────────────────
  private createTokenParticles(): void {
    const count = 50;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const tokenIndices = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 2.0 + Math.random() * 0.5;

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      sizes[i] = Math.random() * 2 + 1;
      tokenIndices[i] = Math.floor(Math.random() * 6);
    }

    const geo = new BufferGeometry();
    geo.setAttribute('position', new Float32BufferAttribute(positions, 3));
    geo.setAttribute('aSize', new Float32BufferAttribute(sizes, 1));
    geo.setAttribute('aTokenIndex', new Float32BufferAttribute(tokenIndices, 1));

    const mat = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      vertexShader: `
        attribute float aSize;
        attribute float aTokenIndex;
        uniform float uTime;
        varying float vTokenIndex;
        varying float vAlpha;

        void main() {
          vTokenIndex = aTokenIndex;
          
          // Orbit animation
          float angle = uTime * 0.3 + aTokenIndex * 1.0;
          float radius = 2.0;
          vec3 pos = position;
          pos.x = cos(angle) * radius;
          pos.z = sin(angle) * radius;
          pos.y = sin(uTime * 0.5 + aTokenIndex) * 0.3;
          
          vAlpha = 0.6 + sin(uTime * 2.0 + aTokenIndex) * 0.2;
          
          vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = aSize * (100.0 / -mvPos.z);
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        precision highp float;
        varying float vTokenIndex;
        varying float vAlpha;

        void main() {
          float d = length(gl_PointCoord - 0.5);
          if (d > 0.5) discard;
          
          // Different colors for different tokens
          vec3 colors[6];
          colors[0] = vec3(0.0, 1.0, 1.0);   // DATA
          colors[1] = vec3(0.5, 0.0, 1.0);   // TOKEN
          colors[2] = vec3(0.0, 1.0, 0.8);   // VECTOR
          colors[3] = vec3(0.3, 0.0, 0.8);   // MODEL
          colors[4] = vec3(0.0, 0.8, 1.0);   // PROMPT
          colors[5] = vec3(0.4, 0.0, 1.0);   // REASON
          
          int index = int(vTokenIndex);
          vec3 color = colors[index];
          
          float alpha = smoothstep(0.5, 0.0, d) * vAlpha;
          gl_FragColor = vec4(color * 1.5, alpha);
        }
      `,
      uniforms: { uTime: { value: 0 } },
    });

    this.tokenParticles = new Points(geo, mat);
    this.networkGroup.add(this.tokenParticles);
  }

  // ── Public API ───────────────────────────────────────────────────────
  updateScroll(progress: number): void {
    this.scrollProgress = progress;
  }

  updateMouse(nx: number, ny: number): void {
    this.mouseX = nx;
    this.mouseY = ny;
  }

  triggerTokenBurst(): void {
    // Trigger assembly animation - nodes gather from scattered to final positions
    this.isAssembling = true;
    this.assemblyProgress = 0;
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

    // Update assembly animation progress
    if (this.isAssembling) {
      this.assemblyProgress += 0.02; // Progress over ~50 frames
      if (this.assemblyProgress >= 1.0) {
        this.assemblyProgress = 1.0;
        this.isAssembling = false;
      }
    }

    // Smooth rotation following mouse
    this.targetRotY = this.mouseX * 0.5;
    this.targetRotX = this.mouseY * 0.3;
    this.currentRotX += (this.targetRotX - this.currentRotX) * 0.05;
    this.currentRotY += (this.targetRotY - this.currentRotY) * 0.05;
    this.networkGroup.rotation.x = this.currentRotX;
    this.networkGroup.rotation.y = this.currentRotY + elapsed * 0.1;

    // Core pulse
    const corePulse = 1.0 + Math.sin(elapsed * 3.0) * 0.1;
    this.core.scale.set(corePulse, corePulse, corePulse);

    // Update shader uniforms
    (this.core.material as ShaderMaterial).uniforms['uTime'].value = elapsed;
    (this.nodes.material as ShaderMaterial).uniforms['uTime'].value = elapsed;
    (this.nodes.material as ShaderMaterial).uniforms['uAssembly'].value = this.assemblyProgress;
    (this.tokenParticles.material as ShaderMaterial).uniforms['uTime'].value = elapsed;

    // Pulse connections
    this.connections.forEach((line, i) => {
      const pulse = Math.sin(elapsed * 2.0 + i * 0.5) * 0.2 + 0.3;
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
    this.disposed = true;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }
    window.removeEventListener('resize', this.resizeHandler);

    this.networkGroup.traverse((child) => {
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

    this.renderer.dispose();
  }
}
