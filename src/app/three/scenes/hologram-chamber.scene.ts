import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  PlaneGeometry,
  CanvasTexture,
  ShaderMaterial,
  Mesh,
  MeshBasicMaterial,
  Clock,
  AdditiveBlending,
  Color,
  Group,
  Vector3,
  Raycaster,
  Vector2,
  DoubleSide,
} from 'three';

interface PanelInfo {
  title: string;
  content: string;
  index: number;
  position: { x: number; y: number; z: number };
}

/**
 * Hologram Chamber Scene
 *
 * Eight floating panels arranged in an arc, each with procedural canvas
 * textures, Fresnel + scanline shader, and raycaster-based hover detection.
 */
export class HologramChamberScene {
  private scene!: Scene;
  private camera!: PerspectiveCamera;
  private renderer!: WebGLRenderer;
  private clock!: Clock;
  private animationId: number | null = null;
  private resizeHandler!: () => void;
  private disposed = false;

  private panels: Mesh[] = [];
  private panelContainer!: Group;
  private raycaster = new Raycaster();
  private pointer = new Vector2(-10, -10);
  private _hoveredIndex = -1;

  private scrollProgress = 0;
  private mouseX = 0;
  private mouseY = 0;

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
    this.camera.position.z = 6;

    this.renderer = new WebGLRenderer({
      canvas: this.canvas,
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.setClearColor(0x000000, 1);

    this.resizeRenderer();

    this.panelContainer = new Group();
    this.scene.add(this.panelContainer);
  }

  // ── Procedural canvas textures ───────────────────────────────────────
  private static PANEL_DATA: { title: string; content: string; hue: number }[] = [
    { title: 'NAV SYSTEM',   content: 'STAR VECTOR LOCK',        hue: 170 },
    { title: 'SHEILD ARRAY',  content: 'DEFENSE GRID ACTIVE',    hue: 160 },
    { title: 'WARP CORE',     content: 'PLASMA CONTAINMENT OK',   hue: 180 },
    { title: 'SENSOR SWEEP',  content: 'SCANNING SECTOR 7-G',    hue: 150 },
    { title: 'COMMS ARRAY',   content: 'SUBSPACE LINK STABLE',    hue: 190 },
    { title: 'POWER GRID',    content: 'OUTPUT AT 94.7%',        hue: 175 },
    { title: 'LIFE SUPPORT',  content: 'ATMOSPHERE NOMINAL',      hue: 155 },
    { title: 'TACTICAL HUD',  content: 'THREAT LEVEL: GREEN',     hue: 185 },
  ];

  private createPanelTexture(
    title: string,
    content: string,
    hue: number,
    index: number
  ): CanvasTexture {
    const w = 512;
    const h = 340;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d')!;

    // Background
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, `hsla(${hue}, 80%, 8%, 0.95)`);
    bg.addColorStop(1, `hsla(${hue}, 60%, 4%, 0.9)`);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Border
    ctx.strokeStyle = `hsla(${hue}, 100%, 60%, 0.7)`;
    ctx.lineWidth = 3;
    ctx.strokeRect(4, 4, w - 8, h - 8);

    // Corner accents
    const cornerLen = 30;
    ctx.lineWidth = 2;
    ctx.strokeStyle = `hsla(${hue}, 100%, 75%, 0.9)`;
    // top-left
    ctx.beginPath();
    ctx.moveTo(4, 4 + cornerLen);
    ctx.lineTo(4, 4);
    ctx.lineTo(4 + cornerLen, 4);
    ctx.stroke();
    // top-right
    ctx.beginPath();
    ctx.moveTo(w - 4 - cornerLen, 4);
    ctx.lineTo(w - 4, 4);
    ctx.lineTo(w - 4, 4 + cornerLen);
    ctx.stroke();
    // bottom-left
    ctx.beginPath();
    ctx.moveTo(4, h - 4 - cornerLen);
    ctx.lineTo(4, h - 4);
    ctx.lineTo(4 + cornerLen, h - 4);
    ctx.stroke();
    // bottom-right
    ctx.beginPath();
    ctx.moveTo(w - 4 - cornerLen, h - 4);
    ctx.lineTo(w - 4, h - 4);
    ctx.lineTo(w - 4, h - 4 - cornerLen);
    ctx.stroke();

    // Title
    ctx.font = 'bold 28px monospace';
    ctx.fillStyle = `hsla(${hue}, 100%, 70%, 1)`;
    ctx.textAlign = 'center';
    ctx.fillText(title, w / 2, 52);

    // Divider line
    ctx.strokeStyle = `hsla(${hue}, 80%, 55%, 0.5)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(40, 68);
    ctx.lineTo(w - 40, 68);
    ctx.stroke();

    // Content
    ctx.font = '18px monospace';
    ctx.fillStyle = `hsla(${hue}, 70%, 75%, 0.85)`;
    ctx.fillText(content, w / 2, 100);

    // Abstract data bars
    for (let i = 0; i < 6; i++) {
      const barY = 130 + i * 28;
      const barW = 60 + Math.sin(index * 3 + i * 1.7) * 100 + 100;
      const barX = 40;
      ctx.fillStyle = `hsla(${hue}, 80%, 40%, 0.25)`;
      ctx.fillRect(barX, barY, w - 80, 14);
      ctx.fillStyle = `hsla(${hue}, 100%, 55%, 0.65)`;
      ctx.fillRect(barX, barY, barW, 14);
    }

    // Glowing dots (data nodes)
    for (let i = 0; i < 5; i++) {
      const dx = 80 + i * 90;
      const dy = 300 + Math.sin(index + i) * 10;
      ctx.beginPath();
      ctx.arc(dx, dy, 4, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${hue}, 100%, 70%, 0.8)`;
      ctx.fill();
      // connecting lines
      if (i > 0) {
        ctx.strokeStyle = `hsla(${hue}, 80%, 55%, 0.3)`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(dx - 90, 300 + Math.sin(index + i - 1) * 10);
        ctx.lineTo(dx, dy);
        ctx.stroke();
      }
    }

    const tex = new CanvasTexture(c);
    tex.needsUpdate = true;
    return tex;
  }

  // ── Panel geometry & materials ───────────────────────────────────────
  private createPanels(): void {
    const geo = new PlaneGeometry(1.2, 0.8);
    const data = HologramChamberScene.PANEL_DATA;
    const arcSpread = Math.PI * 0.7;
    const radius = 4;

    for (let i = 0; i < 8; i++) {
      const angle = -arcSpread / 2 + (i / 7) * arcSpread;
      const tex = this.createPanelTexture(data[i].title, data[i].content, data[i].hue, i);

      const mat = new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        side: DoubleSide,
        vertexShader: `
          varying vec2 vUv;
          varying vec3 vNormal;
          varying vec3 vViewPosition;
          void main() {
            vUv = uv;
            vNormal = normalize(normalMatrix * normal);
            vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
            vViewPosition = -mvPos.xyz;
            gl_Position = projectionMatrix * mvPos;
          }
        `,
        fragmentShader: `
          precision highp float;
          uniform sampler2D uTexture;
          uniform float uTime;
          uniform float uHover;
          varying vec2 vUv;
          varying vec3 vNormal;
          varying vec3 vViewPosition;

          void main() {
            vec4 texColor = texture2D(uTexture, vUv);

            // Fresnel rim glow
            vec3 viewDir = normalize(vViewPosition);
            float fresnel = pow(1.0 - abs(dot(viewDir, vNormal)), 2.0);

            // Scanlines
            float scanline = sin(vUv.y * 120.0 + uTime * 3.0) * 0.5 + 0.5;
            scanline = pow(scanline, 10.0) * 0.15;

            // Hover boost
            float hoverBoost = uHover * 0.3;

            vec3 color = texColor.rgb + fresnel * vec3(0.0, 0.8, 1.0) * 0.5;
            color += scanline * vec3(0.0, 1.0, 0.9);
            color += hoverBoost * vec3(0.2, 0.8, 1.0);

            float alpha = texColor.a * 0.9 + fresnel * 0.3 + scanline + hoverBoost;
            alpha = clamp(alpha, 0.0, 1.0);

            gl_FragColor = vec4(color, alpha);
          }
        `,
        uniforms: {
          uTexture: { value: tex },
          uTime: { value: 0 },
          uHover: { value: 0 },
        },
      });

      const panel = new Mesh(geo, mat);
      panel.position.set(
        Math.sin(angle) * radius,
        0,
        Math.cos(angle) * radius - radius
      );
      panel.lookAt(0, 0, -radius * 2);

      this.panelContainer.add(panel);
      this.panels.push(panel);
    }
  }

  // ── Public API ───────────────────────────────────────────────────────
  get hoveredIndex(): number {
    return this._hoveredIndex;
  }

  getPanelInfo(i: number): PanelInfo | null {
    if (i < 0 || i >= this.panels.length) return null;
    const data = HologramChamberScene.PANEL_DATA;
    const p = this.panels[i];
    return {
      title: data[i].title,
      content: data[i].content,
      index: i,
      position: { x: p.position.x, y: p.position.y, z: p.position.z },
    };
  }

  updateScroll(progress: number): void {
    this.scrollProgress = progress;
  }

  updateMouse(nx: number, ny: number): void {
    this.mouseX = nx;
    this.mouseY = ny;
  }

  // ── Events ───────────────────────────────────────────────────────────
  private bindEvents(): void {
    this.resizeHandler = () => this.resizeRenderer();
    window.addEventListener('resize', this.resizeHandler);

    this.canvas.addEventListener('pointermove', (e: PointerEvent) => {
      const rect = this.canvas.getBoundingClientRect();
      this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    });

    this.canvas.addEventListener('pointerleave', () => {
      this.pointer.set(-10, -10);
    });
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

    // Raycaster hover detection
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const intersects = this.raycaster.intersectObjects(this.panels);

    const newHovered = intersects.length > 0
      ? this.panels.indexOf(intersects[0].object as Mesh)
      : -1;
    this._hoveredIndex = newHovered;

    // Update each panel
    for (let i = 0; i < this.panels.length; i++) {
      const mat = this.panels[i].material as ShaderMaterial;
      mat.uniforms['uTime'].value = elapsed;

      // Smooth hover transition
      const targetHover = i === newHovered ? 1.0 : 0.0;
      mat.uniforms['uHover'].value +=
        (targetHover - mat.uniforms['uHover'].value) * 0.1;

      // Gentle floating
      this.panels[i].position.y =
        Math.sin(elapsed * 0.8 + i * 0.5) * 0.08;
    }

    // Container rotation from scroll + mouse
    this.panelContainer.rotation.y +=
      (this.scrollProgress * Math.PI * 0.5 + this.mouseX * 0.15 -
        this.panelContainer.rotation.y) * 0.03;
    this.panelContainer.rotation.x +=
      (this.mouseY * 0.1 - this.panelContainer.rotation.x) * 0.03;

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

    for (const panel of this.panels) {
      panel.geometry.dispose();
      const mat = panel.material as ShaderMaterial;
      if (mat.uniforms['uTexture']?.value) {
        (mat.uniforms['uTexture'].value as CanvasTexture).dispose();
      }
      mat.dispose();
    }

    this.renderer.dispose();
  }
}
