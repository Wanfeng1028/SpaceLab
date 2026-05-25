import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  SphereGeometry,
  Mesh,
  MeshPhysicalMaterial,
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
 * premium 3D 科技星际仪与液态晶格场景
 * 包含：
 * 1. 巨大且缓缓变形的液态物理玻璃核心 (MeshPhysicalMaterial + CPU Vertex Displacement Wave)
 * 2. 三圈交织自转的发光科技星轨线 (TorusGeometry + MeshBasicMaterial)
 * 3. 沿星轨持续匀速滑行的数据节点小球
 * 4. 极其稀疏淡雅的慢漂极地坐标底星 (35个)
 */
export class HeroLightFieldScene {
  private scene!: Scene;
  private camera!: PerspectiveCamera;
  private renderer!: WebGLRenderer;

  // 核心相关
  private coreMesh!: Mesh;
  private coreGeometry!: SphereGeometry;
  private originalCorePositions!: Float32Array;

  // 星轨相关
  private orbitGroups: Group[] = [];
  private orbitDataNodes: Mesh[] = [];

  // 其他组件
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
    this.initLiquidCore();
    this.initOrbitRings();
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
    this.renderer.toneMappingExposure = 1.5;
  }

  private initLighting(): void {
    // 环境光 — 虚无深邃的冷靛蓝暗底
    const ambient = new AmbientLight(0x0a0c20, 0.5);
    this.scene.add(ambient);

    // 主反应源霓虹青光 — 从右上方直射核心
    const mainLight = new PointLight(0x00f0ff, 3.5, 100);
    mainLight.position.set(12, 18, 15);
    this.scene.add(mainLight);

    // 辅助霓虹紫光 — 从左下方映射偏振面
    const fillLight = new PointLight(0xbd00ff, 3.0, 80);
    fillLight.position.set(-15, -10, 10);
    this.scene.add(fillLight);

    // 逆向轮廓红光 — 在球体背面打出边缘极光高光
    const rimLight = new PointLight(0xff007f, 2.5, 60);
    rimLight.position.set(0, 5, -20);
    this.scene.add(rimLight);
  }

  private initLiquidCore(): void {
    // 采用 48x48 细分既保证波形细腻，又防止 CPU 顶点计算过载
    this.coreGeometry = new SphereGeometry(5.0, 48, 48);
    const posAttr = this.coreGeometry.getAttribute('position') as Float32BufferAttribute;
    
    // 保存初始顶点用于波形偏移计算
    this.originalCorePositions = new Float32Array(posAttr.array);

    // 顶奢物理玻璃：高穿透折射 + 边缘光透镜效应
    const material = new MeshPhysicalMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.25,
      roughness: 0.04,
      metalness: 0.0,
      transmission: 0.96, // 晶莹剔透
      thickness: 4.8, // 厚实重玻璃折射率
      ior: 1.56,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
      envMapIntensity: 1.4,
      attenuationColor: new Color('#00f0ff'), // 边缘漫游青色折射
      attenuationDistance: 8.0,
    });

    this.coreMesh = new Mesh(this.coreGeometry, material);
    this.scene.add(this.coreMesh);
  }

  private initOrbitRings(): void {
    // 星轨配置 — 三圈大小、倾角互锁的科幻轨线
    const ringConfigs = [
      { radius: 8.5, tube: 0.03, color: 0x00f0ff, rotX: 1.1, rotY: 0.4, rotZ: 0.1, speed: 0.8 },
      { radius: 11.5, tube: 0.024, color: 0xbd00ff, rotX: 0.3, rotY: 1.2, rotZ: -0.4, speed: -0.6 },
      { radius: 14.5, tube: 0.02, color: 0xff007f, rotX: -0.7, rotY: -0.5, rotZ: 1.0, speed: 0.5 },
    ];

    for (const cfg of ringConfigs) {
      const orbitGroup = new Group();
      
      // 1. 绘制科幻发光线条轨环 (使用 Torus 制作高精度 3D 实心圆管)
      const ringGeom = new TorusGeometry(cfg.radius, cfg.tube, 8, 96);
      const ringMat = new MeshBasicMaterial({
        color: cfg.color,
        transparent: true,
        opacity: 0.45,
        blending: AdditiveBlending,
      });
      const ringMesh = new Mesh(ringGeom, ringMat);
      orbitGroup.add(ringMesh);

      // 2. 在星轨上绘制滑动的数据晶格球
      const gliderGeom = new SphereGeometry(0.18, 16, 16);
      const gliderMat = new MeshBasicMaterial({
        color: cfg.color,
        transparent: true,
        opacity: 0.9,
        blending: AdditiveBlending,
      });
      const gliderMesh = new Mesh(gliderGeom, gliderMat);
      
      // 记录初始数据包运动学属性
      gliderMesh.userData = {
        radius: cfg.radius,
        speed: cfg.speed,
        angleOffset: Math.random() * Math.PI * 2,
      };

      orbitGroup.add(gliderMesh);
      this.orbitDataNodes.push(gliderMesh);

      // 3. 应用星轨空间初始姿态旋转，使其多维互锁
      orbitGroup.rotation.set(cfg.rotX, cfg.rotY, cfg.rotZ);

      this.scene.add(orbitGroup);
      this.orbitGroups.push(orbitGroup);
    }
  }

  private initBackdropStars(): void {
    // 替换密密麻麻的杂乱尘埃为 35 个极其轻柔、静谧的空间坐标系悬浮星
    const starCount = 35;
    const geometry = new BufferGeometry();
    const positions = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3;
      positions[i3] = MathUtils.randFloatSpread(100);
      positions[i3 + 1] = MathUtils.randFloatSpread(60);
      positions[i3 + 2] = MathUtils.randFloat(-40, -10);
    }

    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));

    const material = new PointsMaterial({
      size: 0.6,
      color: 0xffffff,
      transparent: true,
      opacity: 0.25,
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
        scrub: 2.0, // 平滑高感运镜
      }
    });

    // 第一阶段：近身穿过外围科技星环，审视波动反应核心
    tl.to(camPos, {
      x: -3.5,
      y: -2.5,
      z: 18,
      ease: 'power1.inOut',
    }, 0);

    // 第二阶段：全景后撤，斜向斜插广角宏观俯视这套精密科技仪器
    tl.to(camPos, {
      x: 10,
      y: 10,
      z: 32,
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

    // 鼠标微小阻尼视差
    this.mouseX += (this.targetMouseX - this.mouseX) * 0.02;
    this.mouseY += (this.targetMouseY - this.mouseY) * 0.02;

    // 1. CPU 液态变形反应核数学位移算法
    if (this.coreGeometry && this.originalCorePositions) {
      const posAttr = this.coreGeometry.getAttribute('position') as Float32BufferAttribute;
      const array = posAttr.array as Float32Array;
      const orig = this.originalCorePositions;

      for (let i = 0; i < array.length; i += 3) {
        const x = orig[i];
        const y = orig[i + 1];
        const z = orig[i + 2];

        // 规范化球表面矢量
        const len = Math.sqrt(x * x + y * y + z * z);
        const nx = x / len;
        const ny = y / len;
        const nz = z / len;

        // 三重正弦波干涉创造有机起伏噪声
        const wave = Math.sin(nx * 2.4 + time * 1.5) *
                     Math.cos(ny * 2.0 + time * 1.2) *
                     Math.sin(nz * 1.6 + time * 1.8) * 0.55; // 波幅控制

        array[i] = x + nx * wave;
        array[i + 1] = y + ny * wave;
        array[i + 2] = z + nz * wave;
      }
      posAttr.needsUpdate = true;
      this.coreGeometry.computeVertexNormals(); // 实时计算法线映射玻璃折射
    }

    // 缓慢旋转反应核自转
    if (this.coreMesh) {
      this.coreMesh.rotation.y = time * 0.05;
      this.coreMesh.rotation.x = Math.sin(time * 0.02) * 0.08;
    }

    // 2. 科技轨线自转
    for (let i = 0; i < this.orbitGroups.length; i++) {
      const group = this.orbitGroups[i];
      // 细微的对立旋转
      group.rotation.z = time * (i % 2 === 0 ? 0.06 : -0.04);
    }

    // 3. 数据节点沿轨循环滑移
    for (const node of this.orbitDataNodes) {
      const d = node.userData;
      const angle = time * d['speed'] + d['angleOffset'];
      node.position.x = Math.cos(angle) * d['radius'];
      node.position.y = Math.sin(angle) * d['radius'];
      node.position.z = 0; // Torus是平面几何，节点在局部坐标Z轴归零即可
    }

    // 4. 背景静星缓慢极速漂移
    if (this.backgroundStars) {
      this.backgroundStars.rotation.y = time * 0.003;
    }

    // 相机微小跟随 (视差效果)
    this.camera.position.x += (this.mouseX * 1.5 - this.camera.position.x) * 0.02;
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

    if (this.coreGeometry) {
      this.coreGeometry.dispose();
      (this.coreMesh.material as MeshPhysicalMaterial).dispose();
    }

    for (const group of this.orbitGroups) {
      group.traverse((child) => {
        if (child instanceof Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    }

    if (this.backgroundStars) {
      this.backgroundStars.geometry.dispose();
      (this.backgroundStars.material as PointsMaterial).dispose();
    }

    this.renderer.dispose();
  }
}
