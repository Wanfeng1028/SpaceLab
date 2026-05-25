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
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/**
 * 3D 宇宙星系与科幻霓虹场景
 * 具有对数螺旋旋臂的 Galaxy 尘埃场 + 赛博霓虹点光源 + 具折射效果的浮空玻璃星体 + 鼠标重力涟漪
 */
export class HeroLightFieldScene {
  private scene!: Scene;
  private camera!: PerspectiveCamera;
  private renderer!: WebGLRenderer;
  private orbs: Mesh[] = [];
  private starDust!: Points;
  private glowGroup!: Group;
  private originalPositions!: Float32Array;
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
    this.starCount = isMobile ? 180 : 550; // 显著增加恒星数量以表现旋臂
    this.dpr = Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2);
  }

  init(): void {
    this.initScene();
    this.initLighting();
    this.initGlassOrbs();
    this.initStarDust();
    this.bindEvents();
    if (typeof window !== 'undefined') {
      this.initScrollTrigger();
    }
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
    this.camera.position.set(0, 0, 42);

    this.renderer = new WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
    });
    this.renderer.setPixelRatio(this.dpr);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.toneMapping = 1; // ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.4;
  }

  private initLighting(): void {
    // 环境光 — 调低强度以凸显霓虹点光源
    const ambient = new AmbientLight(0x0a0c1a, 0.4);
    this.scene.add(ambient);

    // 主点光源 — 霓虹青色 (Neon Cyan) 从右上方投射
    const mainLight = new PointLight(0x00f0ff, 2.5, 120);
    mainLight.position.set(18, 22, 20);
    this.scene.add(mainLight);

    // 辅助光源 — 电磁紫色 (Electric Purple) 从左下方投射
    const fillLight = new PointLight(0xbd00ff, 2.0, 100);
    fillLight.position.set(-15, -12, 15);
    this.scene.add(fillLight);

    // 逆向轮廓光 — 极光粉色 (Neon Pink) 从后方勾勒边缘
    const backLight = new PointLight(0xff007f, 1.5, 80);
    backLight.position.set(0, 8, -25);
    this.scene.add(backLight);
  }

  private initGlassOrbs(): void {
    this.glowGroup = new Group();
    this.scene.add(this.glowGroup);

    // 玻璃星体配置 — 高折射率物理玻璃材质
    const orbConfigs = this.generateOrbConfigs();

    for (const cfg of orbConfigs) {
      const geometry = new SphereGeometry(cfg.radius, 64, 64);
      const material = new MeshPhysicalMaterial({
        color: cfg.color,
        transparent: true,
        opacity: cfg.opacity,
        roughness: 0.02, // 极其光滑的抛光表面
        metalness: 0.0,
        transmission: 0.95, // 极高穿透率
        thickness: cfg.radius * 1.8, // 增加厚度，增强光的折射畸变
        ior: 1.55, // 高折射率
        clearcoat: 1.0,
        clearcoatRoughness: 0.02,
        envMapIntensity: 1.2,
        attenuationColor: cfg.attenuationColor,
        attenuationDistance: cfg.radius * 3.5,
      });

      const mesh = new Mesh(geometry, material);
      mesh.position.set(cfg.x, cfg.y, cfg.z);
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

    const templates = [
      { r: 2.8, x: 12, y: 6, z: -5, color: '#d0f8ff', atten: '#00f0ff', opacity: 0.4 },
      { r: 1.6, x: -14, y: -4, z: -8, color: '#ffd0fc', atten: '#bd00ff', opacity: 0.35 },
      { r: 3.5, x: -8, y: 10, z: -15, color: '#ebd0ff', atten: '#8f7cff', opacity: 0.3 },
      { r: 1.2, x: 16, y: -8, z: -3, color: '#d8e8ff', atten: '#00bcff', opacity: 0.4 },
      { r: 2.0, x: 5, y: -12, z: -10, color: '#ffd5e5', atten: '#ff007f', opacity: 0.35 },
      { r: 0.9, x: -18, y: 3, z: -2, color: '#f0e8ff', atten: '#bd00ff', opacity: 0.45 },
      { r: 2.4, x: -3, y: 8, z: -20, color: '#d0f8ff', atten: '#00f0ff', opacity: 0.25 },
      { r: 1.4, x: 10, y: -3, z: -12, color: '#ffe5ee', atten: '#ff007f', opacity: 0.35 },
      { r: 1.8, x: -10, y: -10, z: -6, color: '#d4ffeb', atten: '#00ffaa', opacity: 0.3 },
      { r: 0.7, x: 18, y: 12, z: -8, color: '#fff0c0', atten: '#ffd21f', opacity: 0.45 },
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
        floatSpeed: 0.25 + Math.random() * 0.35,
        floatAmplitude: 0.4 + Math.random() * 0.8,
        phaseOffset: Math.random() * Math.PI * 2,
        rotationSpeed: 0.04 + Math.random() * 0.08,
      });
    }

    return configs;
  }

  private initStarDust(): void {
    const geometry = new BufferGeometry();
    const positions = new Float32Array(this.starCount * 3);
    this.originalPositions = new Float32Array(this.starCount * 3);
    const sizes = new Float32Array(this.starCount);

    // 对数螺线公式构建双旋臂银河
    for (let i = 0; i < this.starCount; i++) {
      const i3 = i * 3;
      
      // 距离银河中心的半径 (幂函数使核心区更密集)
      const r = Math.pow(Math.random(), 1.8) * 44 + 1.5;
      
      // 双旋臂偏角，添加随机抖动产生自然星云厚度
      const armIndex = i % 2 === 0 ? 0 : Math.PI;
      const theta = r * 0.16 + armIndex + MathUtils.randFloatSpread(0.45);
      
      // 粒子三维偏移
      const x = Math.cos(theta) * r + MathUtils.randFloatSpread(1.2);
      const y = MathUtils.randFloatSpread(1.0 + r * 0.04); // 银河盘面扁平化
      const z = Math.sin(theta) * r + MathUtils.randFloatSpread(1.2) - 10;

      positions[i3] = x;
      positions[i3 + 1] = y;
      positions[i3 + 2] = z;

      this.originalPositions[i3] = x;
      this.originalPositions[i3 + 1] = y;
      this.originalPositions[i3 + 2] = z;

      sizes[i] = MathUtils.randFloat(0.4, 1.4);
    }

    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    geometry.setAttribute('size', new Float32BufferAttribute(sizes, 1));

    const material = new PointsMaterial({
      size: 0.9,
      color: 0x00f0ff, // 基础青色高亮恒星
      transparent: true,
      opacity: 0.65,
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

  private initScrollTrigger(): void {
    gsap.registerPlugin(ScrollTrigger);

    const camPos = this.camera.position;

    // 创建平滑绑定的 GSAP 时间轴，以视窗滚动驱动
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: 'body',
        start: 'top top',
        end: 'bottom bottom',
        scrub: 1.8, // 柔和缓冲运镜
      }
    });

    // 第一阶段：滚动到 3D Portal 区域 (近距离掠过浮空玻璃星球)
    tl.to(camPos, {
      x: -8,
      y: -6,
      z: 24,
      ease: 'power1.inOut',
    }, 0);

    // 第二阶段：滚动到 Contact 底部区域 (广角后撤，仰视浩瀚星系)
    tl.to(camPos, {
      x: 16,
      y: 14,
      z: 50,
      ease: 'power1.inOut',
    }, 1);
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

    // 鼠标视差平滑插值
    this.mouseX += (this.targetMouseX - this.mouseX) * 0.02;
    this.mouseY += (this.targetMouseY - this.mouseY) * 0.02;

    // 玻璃星体缓慢漂浮旋转
    for (const orb of this.orbs) {
      const d = orb.userData;
      orb.position.x = d['baseX'] + Math.sin(time * d['floatSpeed'] + d['phaseOffset']) * d['floatAmplitude'];
      orb.position.y = d['baseY'] + Math.cos(time * d['floatSpeed'] * 0.85 + d['phaseOffset']) * d['floatAmplitude'] * 0.75;
      orb.rotation.y = time * d['rotationSpeed'];
      orb.rotation.x = time * d['rotationSpeed'] * 0.25;
    }

    // 银河星系恒星自主转动 + 鼠标重力畸变交互
    if (this.starDust && this.originalPositions) {
      const posAttr = this.starDust.geometry.getAttribute('position') as Float32BufferAttribute;
      const positions = posAttr.array as Float32Array;
      
      const mouse3DX = this.mouseX * 30;
      const mouse3DY = this.mouseY * 18;
      const spinAngle = time * 0.03; // 星系缓慢盘旋旋转

      for (let i = 0; i < this.starCount; i++) {
        const i3 = i * 3;
        const ox = this.originalPositions[i3];
        const oy = this.originalPositions[i3 + 1];
        const oz = this.originalPositions[i3 + 2] + 10; // 还原原本 z

        // 1. 转动恒星基础位置
        const cosA = Math.cos(spinAngle);
        const sinA = Math.sin(spinAngle);
        const rx = ox * cosA - oz * sinA;
        const rz = ox * sinA + oz * cosA - 10; // 重新应用 z 偏移

        // 2. 鼠标引力算法
        const dx = mouse3DX - rx;
        const dy = mouse3DY - oy;
        const dist = Math.sqrt(dx * dx + dy * dy + 9.0);
        
        // 软引力场强度反比于距离
        const force = 3.5 / dist;

        // 3. 应用插值和平滑
        positions[i3] += (rx + (dx / dist) * force - positions[i3]) * 0.08;
        positions[i3 + 1] += (oy + (dy / dist) * force - positions[i3 + 1]) * 0.08;
        positions[i3 + 2] += (rz - positions[i3 + 2]) * 0.08;
      }
      posAttr.needsUpdate = true;
    }

    // 相机微小跟随 (视差效果)
    this.camera.position.x += (this.mouseX * 1.8 - this.camera.position.x) * 0.02;
    this.camera.position.y += (this.mouseY * 1.2 - this.camera.position.y) * 0.02;
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
