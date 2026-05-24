import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  SphereGeometry,
  Mesh,
  MeshPhysicalMaterial,
  Points,
  PointsMaterial,
  BufferGeometry,
  Float32BufferAttribute,
  Color,
  AmbientLight,
  PointLight,
  AdditiveBlending,
  MathUtils,
  Group,
} from 'three';

/**
 * 太空光场场景
 * 干净的奶油色空间 + 柔和光斑 + 6-12 个玻璃星体 + 稀疏星尘
 */
export class HeroLightFieldScene {
  private scene!: Scene;
  private camera!: PerspectiveCamera;
  private renderer!: WebGLRenderer;
  private orbs: Mesh[] = [];
  private starDust!: Points;
  private glowGroup!: Group;
  private animationId: number | null = null;
  private resizeHandler!: () => void;
  private mouseX = 0;
  private mouseY = 0;
  private targetMouseX = 0;
  private targetMouseY = 0;
  private disposed = false;

  private readonly orbCount: number;
  private readonly starCount: number;
  private readonly dpr: number;

  constructor(private canvas: HTMLCanvasElement) {
    const isMobile = window.innerWidth < 768;
    this.orbCount = isMobile ? 6 : 10;
    this.starCount = isMobile ? 80 : 200;
    this.dpr = Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2);
  }

  init(): void {
    this.initScene();
    this.initLighting();
    this.initGlassOrbs();
    this.initStarDust();
    this.bindEvents();
    this.animate();
  }

  private initScene(): void {
    this.scene = new Scene();
    this.camera = new PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      200
    );
    this.camera.position.set(0, 0, 40);

    this.renderer = new WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
    });
    this.renderer.setPixelRatio(this.dpr);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.toneMapping = 1; // ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.2;
  }

  private initLighting(): void {
    // 环境光 — 柔和均匀
    const ambient = new AmbientLight(0xd4cfc4, 0.6);
    this.scene.add(ambient);

    // 主点光 — 暖白色，从右上方
    const mainLight = new PointLight(0xfff5e6, 1.2, 100);
    mainLight.position.set(15, 20, 25);
    this.scene.add(mainLight);

    // 补光 — 冷蓝色，从左下方
    const fillLight = new PointLight(0xc5d8f0, 0.6, 80);
    fillLight.position.set(-12, -10, 20);
    this.scene.add(fillLight);

    // 背光 — 极淡紫色，营造深度
    const backLight = new PointLight(0xe0d0f0, 0.4, 60);
    backLight.position.set(0, 5, -20);
    this.scene.add(backLight);
  }

  private initGlassOrbs(): void {
    this.glowGroup = new Group();
    this.scene.add(this.glowGroup);

    // 玻璃星体配置 — 不同大小、位置、色调
    const orbConfigs = this.generateOrbConfigs();

    for (const cfg of orbConfigs) {
      const geometry = new SphereGeometry(cfg.radius, 48, 48);
      const material = new MeshPhysicalMaterial({
        color: cfg.color,
        transparent: true,
        opacity: cfg.opacity,
        roughness: 0.05,
        metalness: 0.0,
        transmission: 0.92,
        thickness: cfg.radius * 1.5,
        ior: 1.45,
        clearcoat: 1.0,
        clearcoatRoughness: 0.05,
        envMapIntensity: 0.8,
        attenuationColor: cfg.attenuationColor,
        attenuationDistance: cfg.radius * 3,
      });

      const mesh = new Mesh(geometry, material);
      mesh.position.set(cfg.x, cfg.y, cfg.z);
      // 存储初始参数用于动画
      mesh.userData = {
        baseX: cfg.x,
        baseY: cfg.y,
        baseZ: cfg.z,
        floatSpeed: cfg.floatSpeed,
        floatAmplitude: cfg.floatAmplitude,
        phaseOffset: cfg.phaseOffset,
        rotationSpeed: cfg.rotationSpeed,
      };

      this.orbs.push(mesh);
      this.glowGroup.add(mesh);
    }
  }

  private generateOrbConfigs(): Array<{
    radius: number; x: number; y: number; z: number;
    color: Color; opacity: number; attenuationColor: Color;
    floatSpeed: number; floatAmplitude: number;
    phaseOffset: number; rotationSpeed: number;
  }> {
    const configs = [];
    const isMobile = window.innerWidth < 768;
    const spread = isMobile ? 18 : 30;

    // 预定义的玻璃星体 — 手动布局确保美观
    const templates = [
      { r: 2.8, x: 12, y: 6, z: -5, color: '#d8e8ff', atten: '#b8d4ff', opacity: 0.35 },
      { r: 1.6, x: -14, y: -4, z: -8, color: '#ffe8d0', atten: '#ffd4a8', opacity: 0.3 },
      { r: 3.5, x: -8, y: 10, z: -15, color: '#e8e0ff', atten: '#d0c0ff', opacity: 0.25 },
      { r: 1.2, x: 16, y: -8, z: -3, color: '#e0f0ff', atten: '#c0e0ff', opacity: 0.35 },
      { r: 2.0, x: 5, y: -12, z: -10, color: '#fff0e8', atten: '#ffe0d0', opacity: 0.3 },
      { r: 0.9, x: -18, y: 3, z: -2, color: '#f0e8ff', atten: '#e0d0ff', opacity: 0.4 },
      { r: 2.4, x: -3, y: 8, z: -20, color: '#e8f0ff', atten: '#d0e0ff', opacity: 0.2 },
      { r: 1.4, x: 10, y: -3, z: -12, color: '#ffe8f0', atten: '#ffd0e0', opacity: 0.3 },
      { r: 1.8, x: -10, y: -10, z: -6, color: '#e8fff0', atten: '#d0ffe0', opacity: 0.28 },
      { r: 0.7, x: 18, y: 12, z: -8, color: '#fff8e0', atten: '#fff0c0', opacity: 0.4 },
    ];

    for (let i = 0; i < Math.min(this.orbCount, templates.length); i++) {
      const t = templates[i];
      const scale = isMobile ? 0.7 : 1;
      configs.push({
        radius: t.r * scale,
        x: t.x * scale * (spread / 30),
        y: t.y * scale * (spread / 30),
        z: t.z,
        color: new Color(t.color),
        attenuationColor: new Color(t.atten),
        opacity: t.opacity,
        floatSpeed: 0.3 + Math.random() * 0.4,
        floatAmplitude: 0.5 + Math.random() * 1.0,
        phaseOffset: Math.random() * Math.PI * 2,
        rotationSpeed: 0.05 + Math.random() * 0.1,
      });
    }

    return configs;
  }

  private initStarDust(): void {
    const geometry = new BufferGeometry();
    const positions = new Float32Array(this.starCount * 3);
    const sizes = new Float32Array(this.starCount);
    const opacities = new Float32Array(this.starCount);

    for (let i = 0; i < this.starCount; i++) {
      const i3 = i * 3;
      positions[i3] = MathUtils.randFloatSpread(80);
      positions[i3 + 1] = MathUtils.randFloatSpread(50);
      positions[i3 + 2] = MathUtils.randFloat(-30, -5);
      sizes[i] = MathUtils.randFloat(0.3, 1.2);
      opacities[i] = MathUtils.randFloat(0.15, 0.5);
    }

    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    geometry.setAttribute('size', new Float32BufferAttribute(sizes, 1));

    const material = new PointsMaterial({
      size: 0.8,
      color: 0xffffff,
      transparent: true,
      opacity: 0.3,
      blending: AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    this.starDust = new Points(geometry, material);
    this.scene.add(this.starDust);
  }

  private bindEvents(): void {
    this.resizeHandler = () => this.onResize();
    window.addEventListener('resize', this.resizeHandler);

    window.addEventListener('mousemove', (e: MouseEvent) => {
      this.targetMouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      this.targetMouseY = -(e.clientY / window.innerHeight - 0.5) * 2;
    });
  }

  private onResize(): void {
    if (this.disposed) return;
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private animate(): void {
    if (this.disposed) return;
    this.animationId = requestAnimationFrame(() => this.animate());

    const time = Date.now() * 0.001;

    // 鼠标视差 — 平滑插值
    this.mouseX += (this.targetMouseX - this.mouseX) * 0.015;
    this.mouseY += (this.targetMouseY - this.mouseY) * 0.015;

    // 玻璃星体缓慢漂浮
    for (const orb of this.orbs) {
      const d = orb.userData;
      orb.position.x = d['baseX'] + Math.sin(time * d['floatSpeed'] + d['phaseOffset']) * d['floatAmplitude'];
      orb.position.y = d['baseY'] + Math.cos(time * d['floatSpeed'] * 0.8 + d['phaseOffset']) * d['floatAmplitude'] * 0.7;
      orb.rotation.y = time * d['rotationSpeed'];
      orb.rotation.x = time * d['rotationSpeed'] * 0.3;
    }

    // 星尘极缓慢漂移
    if (this.starDust) {
      this.starDust.rotation.y = time * 0.008;
      this.starDust.rotation.x = Math.sin(time * 0.005) * 0.02;
    }

    // 相机跟随鼠标 (parallax) — 轻微
    this.camera.position.x += (this.mouseX * 1.5 - this.camera.position.x) * 0.015;
    this.camera.position.y += (this.mouseY * 1.0 - this.camera.position.y) * 0.015;
    this.camera.lookAt(0, 0, 0);

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
    this.pause();
    window.removeEventListener('resize', this.resizeHandler);

    for (const orb of this.orbs) {
      orb.geometry.dispose();
      (orb.material as MeshPhysicalMaterial).dispose();
    }

    if (this.starDust) {
      this.starDust.geometry.dispose();
      (this.starDust.material as PointsMaterial).dispose();
    }

    this.renderer.dispose();
  }
}
