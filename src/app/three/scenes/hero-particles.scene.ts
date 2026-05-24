import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  BufferGeometry,
  Float32BufferAttribute,
  Points,
  PointsMaterial,
  Color,
  AdditiveBlending,
  MathUtils,
} from 'three';

/**
 * Hero 粒子场场景
 * 轻量级粒子漂浮效果，模拟空间感和光场
 */
export class HeroParticlesScene {
  private scene!: Scene;
  private camera!: PerspectiveCamera;
  private renderer!: WebGLRenderer;
  private particles!: Points;
  private animationId: number | null = null;
  private resizeHandler!: () => void;
  private mouseX = 0;
  private mouseY = 0;
  private targetMouseX = 0;
  private targetMouseY = 0;
  private disposed = false;

  // 根据设备性能调整
  private particleCount: number;
  private dpr: number;

  constructor(private canvas: HTMLCanvasElement) {
    const isMobile = window.innerWidth < 768;
    this.particleCount = isMobile ? 600 : 1500;
    this.dpr = Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2);
  }

  init(): void {
    this.initScene();
    this.initParticles();
    this.bindEvents();
    this.animate();
  }

  private initScene(): void {
    this.scene = new Scene();
    this.camera = new PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    this.camera.position.z = 30;

    this.renderer = new WebGLRenderer({
      canvas: this.canvas,
      antialias: false,
      alpha: true,
    });
    this.renderer.setPixelRatio(this.dpr);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000000, 0);
  }

  private initParticles(): void {
    const geometry = new BufferGeometry();
    const positions = new Float32Array(this.particleCount * 3);
    const colors = new Float32Array(this.particleCount * 3);
    const sizes = new Float32Array(this.particleCount);

    const colorPalette = [
      new Color('#ffd21f'),  // yellow
      new Color('#69d7ff'),  // cyan
      new Color('#8f7cff'),  // violet
      new Color('#f3b9c8'),  // rose
      new Color('#ffffff'),  // white
    ];

    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;
      // 分布在较大空间内
      positions[i3] = MathUtils.randFloatSpread(60);
      positions[i3 + 1] = MathUtils.randFloatSpread(40);
      positions[i3 + 2] = MathUtils.randFloatSpread(40);

      const color = colorPalette[Math.floor(Math.random() * colorPalette.length)];
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;

      sizes[i] = MathUtils.randFloat(0.5, 2.5);
    }

    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
    geometry.setAttribute('size', new Float32BufferAttribute(sizes, 1));

    const material = new PointsMaterial({
      size: 1.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    this.particles = new Points(geometry, material);
    this.scene.add(this.particles);
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

    const time = Date.now() * 0.0003;

    // 鼠标视差平滑插值
    this.mouseX += (this.targetMouseX - this.mouseX) * 0.02;
    this.mouseY += (this.targetMouseY - this.mouseY) * 0.02;

    // 粒子缓慢漂浮
    const positions = this.particles.geometry.attributes['position'];
    const posArray = (positions as Float32BufferAttribute).array as Float32Array;

    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;
      const speed = 0.3 + (i % 5) * 0.05;
      posArray[i3 + 1] += Math.sin(time * speed + i * 0.1) * 0.008;
      posArray[i3] += Math.cos(time * speed * 0.7 + i * 0.05) * 0.005;
    }
    positions.needsUpdate = true;

    // 相机跟随鼠标 (parallax)
    this.camera.position.x += (this.mouseX * 2 - this.camera.position.x) * 0.02;
    this.camera.position.y += (this.mouseY * 1.5 - this.camera.position.y) * 0.02;
    this.camera.lookAt(0, 0, 0);

    // 整体缓慢旋转
    this.particles.rotation.y = time * 0.15;
    this.particles.rotation.x = Math.sin(time * 0.1) * 0.05;

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

    if (this.particles) {
      this.particles.geometry.dispose();
      (this.particles.material as PointsMaterial).dispose();
      this.scene.remove(this.particles);
    }

    this.renderer.dispose();
  }
}
