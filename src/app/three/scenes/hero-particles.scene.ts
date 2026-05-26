import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  SphereGeometry,
  Mesh,
  Color,
  AmbientLight,
  PointLight,
  Group,
  TorusGeometry,
  MeshBasicMaterial,
  Points,
  PointsMaterial,
  BufferGeometry,
  Float32BufferAttribute,
  AdditiveBlending,
  MathUtils,
} from 'three';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/**
 * Dribbble Style — Waving Halo Loop Header Scene
 * 包含：
 * 1. 波动极光光环 (Points + Waving Multi-Wave equation) — 600个发光粒子组成，水平X轴倾斜65度
 * 2. 同心科技轨线 (TorusGeometry + MeshBasicMaterial) — 水平包裹极光环的极细发光网格圈
 * 3. 沿轨运行的数据节点晶格 (Sphere)
 * 4. 极度纯净的慢漂太空坐标底星 (30个)
 */
export class HeroLightFieldScene {
  private scene!: Scene;
  private camera!: PerspectiveCamera;
  private renderer!: WebGLRenderer;

  // 光晕环 Master 组
  private haloGroup!: Group;

  // 极光环粒子
  private haloParticles!: Points;
  private readonly particleCount = 600;

  // 同心科技星轨
  private orbitRings: Mesh[] = [];
  private orbitDataNodes: Mesh[] = [];

  // 背景静星
  private backgroundStars!: Points;
  private animationId: number | null = null;
  private resizeHandler!: () => void;
  private mouseX = 0;
  private mouseY = 0;
  private targetMouseX = 0;
  private targetMouseY = 0;
  private disposed = false;

  private readonly dpr: number;

  constructor(private canvas: HTMLCanvasElement) {
    const isMobile = window.innerWidth < 768;
    this.dpr = Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2);
  }

  init(): void {
    this.initScene();
    this.initLighting();
    this.initHaloLoop();
    this.initBackdropStars();
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
    this.camera.position.set(0, 0, 36);

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
    // 环境光 — 极致虚无的暗蓝宇宙基底
    const ambient = new AmbientLight(0x080918, 0.6);
    this.scene.add(ambient);

    // 主极光光源 — 霓虹青色，渲染环体右翼
    const mainLight = new PointLight(0x00f0ff, 3.5, 90);
    mainLight.position.set(10, 15, 12);
    this.scene.add(mainLight);

    // 辅助极光光源 — 电磁紫色，渲染环体左翼
    const fillLight = new PointLight(0xbd00ff, 3.0, 70);
    fillLight.position.set(-12, -8, 8);
    this.scene.add(fillLight);

    // 背部轮廓光源 — 极光粉色，打亮背景深空边缘
    const rimLight = new PointLight(0xff007f, 2.0, 50);
    rimLight.position.set(0, 4, -15);
    this.scene.add(rimLight);
  }

  private initHaloLoop(): void {
    // 实例化主旋转群组
    this.haloGroup = new Group();

    // 1. 构建波动极光粒子环 (Primary Halo Ribbon)
    const geom = new BufferGeometry();
    const positions = new Float32Array(this.particleCount * 3);
    const radius = 13.5;

    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;
      const theta = (i / this.particleCount) * Math.PI * 2;
      positions[i3] = Math.cos(theta) * radius;
      positions[i3 + 1] = 0;
      positions[i3 + 2] = Math.sin(theta) * radius;
    }

    geom.setAttribute('position', new Float32BufferAttribute(positions, 3));

    const mat = new PointsMaterial({
      size: 0.95,
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.85,
      blending: AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    this.haloParticles = new Points(geom, mat);
    this.haloGroup.add(this.haloParticles);

    // 2. 嵌套极细的同心科幻星轨线 (Torus Orbits)
    const ringConfigs = [
      { radius: 11.5, tube: 0.022, color: 0xbd00ff, opacity: 0.45, speed: 0.65 },
      { radius: 15.5, tube: 0.016, color: 0xff007f, opacity: 0.35, speed: -0.5 },
    ];

    for (const cfg of ringConfigs) {
      // 轨道圈
      const ringGeom = new TorusGeometry(cfg.radius, cfg.tube, 8, 80);
      ringGeom.rotateX(Math.PI * 0.5); // 默认Torus是垂直的，转为水平
      const ringMat = new MeshBasicMaterial({
        color: cfg.color,
        transparent: true,
        opacity: cfg.opacity,
        blending: AdditiveBlending,
      });
      const ringMesh = new Mesh(ringGeom, ringMat);
      this.haloGroup.add(ringMesh);
      this.orbitRings.push(ringMesh);

      // 沿轨道滑行的数据包小球
      const gliderGeom = new SphereGeometry(0.16, 12, 12);
      const gliderMat = new MeshBasicMaterial({
        color: cfg.color,
        transparent: true,
        opacity: 0.9,
        blending: AdditiveBlending,
      });
      const gliderMesh = new Mesh(gliderGeom, gliderMat);
      gliderMesh.userData = {
        radius: cfg.radius,
        speed: cfg.speed,
        angleOffset: Math.random() * Math.PI * 2,
      };
      this.haloGroup.add(gliderMesh);
      this.orbitDataNodes.push(gliderMesh);
    }

    // 3. 将整个光环系统倾斜 65 度 (倾斜为优雅的扁椭圆水平视差环)
    this.haloGroup.rotation.x = Math.PI * 0.36; // 65度倾斜
    this.haloGroup.rotation.y = 0.04;          // 细微斜侧

    this.scene.add(this.haloGroup);
  }

  private initBackdropStars(): void {
    // 30 个慢速慢漂的远空静星，提供极简的空间层次深度，绝不凌乱
    const starCount = 30;
    const geometry = new BufferGeometry();
    const positions = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3;
      positions[i3] = MathUtils.randFloatSpread(90);
      positions[i3 + 1] = MathUtils.randFloatSpread(50);
      positions[i3 + 2] = MathUtils.randFloat(-35, -10);
    }

    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));

    const material = new PointsMaterial({
      size: 0.5,
      color: 0xffffff,
      transparent: true,
      opacity: 0.2,
      blending: AdditiveBlending,
      depthWrite: false,
    });

    this.backgroundStars = new Points(geometry, material);
    this.scene.add(this.backgroundStars);
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

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: 'body',
        start: 'top top',
        end: 'bottom bottom',
        scrub: 2.2, // 电影感阻尼过渡
      }
    });

    // 第一阶段：滚动到 Portal 传送门 (穿入倾斜的光环内部，近景审视旋转线条与数据包)
    tl.to(camPos, {
      x: -4.0,
      y: -3.0,
      z: 16.0,
      ease: 'power1.inOut',
    }, 0);

    // 第二阶段：滚动到 Contact 联系区 (广角后退，斜侧 $35^\circ$ 俯瞰优雅的发光光晕轨迹环)
    tl.to(camPos, {
      x: 12.0,
      y: 9.0,
      z: 32.0,
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

    // 鼠标缓和视差
    this.mouseX += (this.targetMouseX - this.mouseX) * 0.02;
    this.mouseY += (this.targetMouseY - this.mouseY) * 0.02;

    // 1. 极光环正弦流体起伏波形 (CPU Dynamic Wave Equation)
    if (this.haloParticles) {
      const posAttr = this.haloParticles.geometry.getAttribute('position') as Float32BufferAttribute;
      const positions = posAttr.array as Float32Array;

      for (let i = 0; i < this.particleCount; i++) {
        const i3 = i * 3;
        const theta = (i / this.particleCount) * Math.PI * 2;

        // 双重正弦干涉，塑造丝滑、有机的极光波动感
        positions[i3 + 1] = Math.sin(theta * 4.0 + time * 2.0) * 1.25 +
                            Math.cos(theta * 2.0 - time * 1.3) * 0.35;
      }
      posAttr.needsUpdate = true;
    }

    // 2. 发光极光环和科技星轨自身缓慢自转
    if (this.haloGroup) {
      // 缓缓盘旋自转
      this.haloGroup.rotation.z = time * 0.04;
    }

    // 3. 数据节点沿轨滑行
    for (const node of this.orbitDataNodes) {
      const d = node.userData;
      const angle = time * d['speed'] + d['angleOffset'];
      node.position.x = Math.cos(angle) * d['radius'];
      node.position.z = Math.sin(angle) * d['radius'];
      node.position.y = 0; // 水平轨道
    }

    // 4. 背景静星缓慢极微漂移
    if (this.backgroundStars) {
      this.backgroundStars.rotation.y = time * 0.002;
    }

    // 相机跟随鼠标 (阻尼视差效果)
    this.camera.position.x += (this.mouseX * 1.6 - this.camera.position.x) * 0.02;
    this.camera.position.y += (this.mouseY * 1.0 - this.camera.position.y) * 0.02;
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

    if (this.haloParticles) {
      this.haloParticles.geometry.dispose();
      (this.haloParticles.material as PointsMaterial).dispose();
    }

    for (const mesh of this.orbitRings) {
      mesh.geometry.dispose();
      (mesh.material as MeshBasicMaterial).dispose();
    }

    for (const mesh of this.orbitDataNodes) {
      mesh.geometry.dispose();
      (mesh.material as MeshBasicMaterial).dispose();
    }

    if (this.backgroundStars) {
      this.backgroundStars.geometry.dispose();
      (this.backgroundStars.material as PointsMaterial).dispose();
    }

    this.renderer.dispose();
  }
}
