import {
  Scene,
  OrthographicCamera,
  WebGLRenderer,
  PlaneGeometry,
  ShaderMaterial,
  Mesh,
  Vector2,
  Vector3,
  Color,
} from 'three';

/**
 * SpaceLab WebGL Volumetric Scattering Solar Eclipse Scene
 * 
 * Replicates the physical Rayleigh and Mie atmospheric scattering solar eclipse
 * shader from the reference Svelte implementation using Three.js and full-screen shader materials.
 */
export class HeroLightFieldScene {
  private scene!: Scene;
  private camera!: OrthographicCamera;
  private renderer!: WebGLRenderer;
  private material!: ShaderMaterial;
  private quad!: Mesh;
  private animationId: number | null = null;
  private resizeHandler!: () => void;
  private disposed = false;
  private lastFrameTime = performance.now();
  private currentDpr: number;
  private readonly TARGET_FPS = 50;
  private readonly MAX_FRAME_TIME = 1000 / this.TARGET_FPS;
  private startTime = performance.now();
  private readonly boundAnimate = this.animate.bind(this);

  private readonly dpr: number;

  constructor(private canvas: HTMLCanvasElement) {
    const isMobile = window.innerWidth < 768;
    this.dpr = Math.min(window.devicePixelRatio, isMobile ? 1.0 : 1.5);
    this.currentDpr = this.dpr;
  }

  init(): void {
    this.initScene();
    this.bindEvents();
    this.animate();
  }

  private initScene(): void {
    this.scene = new Scene();

    // Orthographic Camera to render a flat 2D full-screen quad
    this.camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);

    this.renderer = new WebGLRenderer({
      canvas: this.canvas,
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(this.dpr);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000000, 1);

    const geometry = new PlaneGeometry(2, 2);

    const vertexShader = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      precision highp float;
      varying vec2 vUv;

      uniform float uTime;
      uniform vec2  uResolution;
      uniform vec3  uBackgroundColor;
      uniform float uRotationSpeed;
      uniform float uCameraDistance;
      uniform float uFov;
      uniform vec3  uSunDir;
      uniform float uIntensity;

      // Extended uniforms (promoted from shader constants)
      uniform float uNoiseIntensity;
      uniform float uNoiseScale;
      uniform float uAtmRadius;
      uniform float uPhRay;
      uniform float uPhMie;
      uniform float uMieG;
      uniform float uKMieEx;
      uniform vec3  uRayleighTint;
      uniform vec3  uMieTint;
      uniform float uSoftMask;

      const float PI      = 3.14159265359;
      const float MAX     = 10000.0;
      const float R_INNER = 1.0;
      const int   NUM_OUT_SCATTER = 4;
      const int   NUM_IN_SCATTER  = 8;

      vec2 ray_vs_sphere(vec3 p, vec3 dir, float r) {
        float b = dot(p, dir);
        float c = dot(p, p) - r * r;
        float d = b * b - c;
        if (d < 0.0) return vec2(MAX, -MAX);
        d = sqrt(d);
        return vec2(-b - d, -b + d);
      }

      float phase_mie(float g, float c, float cc) {
        float gg = g * g;
        float a  = (1.0 - gg) * (1.0 + cc);
        float b  = 1.0 + gg - 2.0 * g * c;
        b *= sqrt(b);
        b *= 2.0 + gg;
        return (3.0 / 8.0 / PI) * a / b;
      }

      float phase_ray(float cc) {
        return (3.0 / 16.0 / PI) * (1.0 + cc);
      }

      float density(vec3 p, float ph) {
        return exp(-max(length(p) - R_INNER, 0.0) / ph);
      }

      float colorLuma(vec3 c) {
        return dot(c, vec3(0.2126, 0.7152, 0.0722));
      }

      vec3 hueFromColor(vec3 c, vec3 fallback) {
        float m = max(max(c.r, c.g), c.b);
        if (m < 1e-5) return fallback;
        return clamp(c / m, 0.0, 1.0);
      }

      vec3 blendAdaptive(vec3 bg, vec3 effect, float softness) {
        float bgLum    = colorLuma(bg);
        float lightBg  = smoothstep(0.45, 0.95, bgLum);
        float edge     = clamp(softness, 0.0, 1.0);
        vec3  additive = bg + effect;
        vec3  effectHue   = hueFromColor(effect, vec3(1.0));
        vec3  tintTarget  = mix(bg, effectHue, 0.85);
        vec3  tint        = mix(bg, tintTarget, edge);
        return mix(additive, tint, lightBg);
      }

      float grain(vec2 uv) {
        vec2 p = floor(uv * uResolution / uNoiseScale);
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }

      vec3 linearToSrgb(vec3 color) {
        vec3 safe    = max(color, vec3(0.0));
        vec3 low     = safe * 12.92;
        vec3 high    = 1.055 * pow(safe, vec3(1.0 / 2.4)) - 0.055;
        vec3 cutoff  = step(vec3(0.0031308), safe);
        return mix(low, high, cutoff);
      }

      float optic(vec3 p, vec3 q, float ph) {
        vec3  s   = (q - p) / float(NUM_OUT_SCATTER);
        vec3  v   = p + s * 0.5;
        float sum = 0.0;
        for (int i = 0; i < NUM_OUT_SCATTER; i++) {
          sum += density(v, ph);
          v   += s;
        }
        sum *= length(s);
        return sum;
      }

      vec3 in_scatter(vec3 o, vec3 dir, vec2 e, vec3 l) {
        const vec3  k_ray    = vec3(3.8, 13.5, 33.1);
        const vec3  k_mie    = vec3(21.0);

        vec3  sum_ray = vec3(0.0);
        vec3  sum_mie = vec3(0.0);
        float n_ray0  = 0.0;
        float n_mie0  = 0.0;
        float len     = (e.y - e.x) / float(NUM_IN_SCATTER);
        vec3  s       = dir * len;
        vec3  v       = o + dir * (e.x + len * 0.5);

        for (int i = 0; i < NUM_IN_SCATTER; i++) {
          float d_ray = density(v, uPhRay) * len;
          float d_mie = density(v, uPhMie) * len;
          n_ray0 += d_ray;
          n_mie0 += d_mie;

          vec2  f      = ray_vs_sphere(v, l, uAtmRadius);
          vec3  u      = v + l * f.y;
          float n_ray1 = optic(v, u, uPhRay);
          float n_mie1 = optic(v, u, uPhMie);

          vec3 att = exp(
            -(n_ray0 + n_ray1) * k_ray
            -(n_mie0 + n_mie1) * k_mie * uKMieEx
          );
          sum_ray += d_ray * att;
          sum_mie += d_mie * att;
          v += s;
        }

        float c       = dot(dir, -l);
        float cc      = c * c;
        vec3  scatter =
          sum_ray * k_ray * uRayleighTint * phase_ray(cc)
          + sum_mie * k_mie * uMieTint      * phase_mie(uMieG, c, cc);
        return scatter;
      }

      mat3 rot3xy(vec2 angle) {
        vec2 c = cos(angle);
        vec2 s = sin(angle);
        return mat3(
          c.y,       0.0, -s.y,
          s.y * s.x, c.x,  c.y * s.x,
          s.y * c.x, -s.x, c.y * c.x
        );
      }

      vec3 ray_dir(float fov, vec2 size, vec2 uv) {
        vec2  xy          = uv * size - size * 0.5;
        float cot_half    = tan(radians(90.0 - fov * 0.5));
        float z           = size.y * 0.5 * cot_half;
        return normalize(vec3(xy, -z));
      }

      void mainImage(out vec4 fragColor, in vec2 uv) {
        vec3 dir = ray_dir(uFov, uResolution.xy, uv);
        vec3 eye = vec3(0.0, 0.0, uCameraDistance);
        mat3 rot = rot3xy(vec2(0.0, uTime * uRotationSpeed));
        dir = rot * dir;
        eye = rot * eye;

        vec3 l  = normalize(uSunDir);
        vec2 e  = ray_vs_sphere(eye, dir, uAtmRadius);
        if (e.x > e.y) {
          fragColor = vec4(uBackgroundColor, 0.0);
          return;
        }
        vec2 f = ray_vs_sphere(eye, dir, R_INNER);
        e.y = min(e.y, f.x);

        vec3  I        = in_scatter(eye, dir, e, l);
        vec3  halo     = I * uIntensity * 10.0;
        float softMsk  = 1.0 - exp(-uSoftMask * colorLuma(halo));
        vec3  rgb      = blendAdaptive(uBackgroundColor, halo, softMsk);
        float alpha    = clamp(colorLuma(rgb) * 2.0, 0.0, 1.0);
        fragColor = vec4(rgb, alpha);
      }

      void main() {
        vec4 fragColor;
        mainImage(fragColor, vUv);
        fragColor.rgb = linearToSrgb(fragColor.rgb);
        fragColor.rgb += (grain(vUv) - 0.5) * uNoiseIntensity;
        gl_FragColor  = fragColor;
      }
    `;

    // Initialize uniforms exactly matching the Svelte live implementation
    this.material = new ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: new Vector2(window.innerWidth * this.dpr, window.innerHeight * this.dpr) },
        uBackgroundColor: { value: new Color('#000000') },
        uRotationSpeed: { value: 1.05 },
        uCameraDistance: { value: 2.6 },
        uFov: { value: 75.0 },
        uSunDir: { value: new Vector3(0, 0, -1) }, // normalized (0, 0, -0.05)
        uIntensity: { value: 2.8 },
        uAtmRadius: { value: 1.5 },
        uPhRay: { value: 0.05 },
        uPhMie: { value: 0.02 },
        uMieG: { value: -0.51 },
        uKMieEx: { value: 1.1 },
        uRayleighTint: { value: new Color('#b2a8ff') },
        uMieTint: { value: new Color('#fcff42') },
        uSoftMask: { value: 1.2 },
        uNoiseIntensity: { value: 0.04 }, // enable high-quality shader noise
        uNoiseScale: { value: 1.0 },
      },
      depthTest: false,
      depthWrite: false,
    });

    this.quad = new Mesh(geometry, this.material);
    this.scene.add(this.quad);
  }

  private bindEvents(): void {
    this.resizeHandler = () => this.onResize();
    window.addEventListener('resize', this.resizeHandler);
  }

  private onResize(): void {
    if (this.disposed) return;
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    const width = window.innerWidth * this.dpr;
    const height = window.innerHeight * this.dpr;
    this.material.uniforms['uResolution'].value.set(width, height);
  }

  private animate(): void {
    if (this.disposed) return;
    this.animationId = requestAnimationFrame(this.boundAnimate);

    const now = performance.now();
    const frameTime = now - this.lastFrameTime;
    this.lastFrameTime = now;

    // 动态质量调节：如果帧时间超过阈值，降低DPR
    if (frameTime > this.MAX_FRAME_TIME && this.currentDpr > 1.0) {
      this.currentDpr = Math.max(1.0, this.currentDpr - 0.1);
      this.renderer.setPixelRatio(this.currentDpr);
      this.onResize(); // 重新设置分辨率
    }

    const elapsedSeconds = (Date.now() - this.startTime) / 1000;
    this.material.uniforms['uTime'].value = elapsedSeconds;

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
      this.animationId = requestAnimationFrame(this.boundAnimate);
    }
  }

  updateIntensity(val: number): void {
    if (this.material && this.material.uniforms['uIntensity']) {
      this.material.uniforms['uIntensity'].value = val;
    }
  }

  updateRotationSpeed(val: number): void {
    if (this.material && this.material.uniforms['uRotationSpeed']) {
      this.material.uniforms['uRotationSpeed'].value = val;
    }
  }

  updateTints(rayleighColor: string, mieColor: string): void {
    if (this.material) {
      if (this.material.uniforms['uRayleighTint']) {
        this.material.uniforms['uRayleighTint'].value.set(rayleighColor);
      }
      if (this.material.uniforms['uMieTint']) {
        this.material.uniforms['uMieTint'].value.set(mieColor);
      }
    }
  }

  destroy(): void {
    this.disposed = true;
    this.pause();
    window.removeEventListener('resize', this.resizeHandler);
    this.quad.geometry.dispose();
    this.material.dispose();
    this.renderer.dispose();
  }
}
