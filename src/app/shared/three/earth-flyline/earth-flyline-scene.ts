import {
  AdditiveBlending,
  BackSide,
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  Clock,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  Line,
  LineBasicMaterial,
  LinearFilter,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Points,
  QuadraticBezierCurve3,
  RingGeometry,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  Texture,
  TextureLoader,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';

import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

import worldJSON from '../globe-stream/map/world.json';

const DEG = Math.PI / 180;

interface FlyStream {
  curve: QuadraticBezierCurve3;
  geometry: BufferGeometry;
  speed: number;
  offset: number;
  length: number;
}

interface PulseRing {
  mesh: Mesh;
  phase: number;
  speed: number;
}

interface Satellite {
  group: Group;
  trail: BufferGeometry;
  radius: number;
  phase: number;
  speed: number;
  tiltX: number;
  tiltY: number;
  tiltZ: number;
  scale: number;
}

export interface EarthFlylineOptions {
  autoRotate?: boolean;
  colorMode?: 'blue' | 'cyan';
}

function latLngToVec3(lat: number, lng: number, radius: number): Vector3 {
  const phi = (90 - lat) * DEG;
  const theta = (lng + 180) * DEG;
  return new Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

function circularPoints(radius: number, segments = 220): Vector3[] {
  const points: Vector3[] = [];
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    points.push(new Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
  }
  return points;
}

export class EarthFlylineScene {
  private scene!: Scene;
  private camera!: PerspectiveCamera;
  private renderer!: WebGLRenderer;
  private composer!: EffectComposer;
  private bloomPass: UnrealBloomPass | null = null;
  private clock = new Clock();
  private globeGroup = new Group();
  private orbitGroup = new Group();
  private textures: Texture[] = [];
  private streams: FlyStream[] = [];
  private pulseRings: PulseRing[] = [];
  private satellites: Satellite[] = [];
  private cloudShell: Mesh | null = null;
  private animatedMaterials: ShaderMaterial[] = [];
  private animationId: number | null = null;
  private resizeHandler!: () => void;
  private pointerMoveHandler!: (event: PointerEvent) => void;
  private pointerDownHandler!: (event: PointerEvent) => void;
  private pointerUpHandler!: (event: PointerEvent) => void;
  private contextLostHandler: ((event: Event) => void) | null = null;
  private disposed = false;
  private pointer = new Vector2();
  private isDragging = false;
  private lastDragX = 0;
  private lastDragY = 0;
  private targetRotationX = -0.08;
  private targetRotationY = Math.PI * 1.18;
  private zoomOffset = 0;
  private rotationControlActive = false;
  private brightnessPercent = 48;
  private readonly globeRadius: number;
  private readonly isMobile = window.innerWidth < 768;
  private readonly reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  constructor(
    private canvas: HTMLCanvasElement,
    private options: EarthFlylineOptions = {},
  ) {
    this.globeRadius = this.isMobile ? 1.82 : 2.34;
  }

  init(): void {
    this.scene = new Scene();
    this.camera = new PerspectiveCamera(42, 1, 0.1, 200);
    this.camera.position.set(0, 0.18, this.isMobile ? 7.2 : 8.6);

    this.renderer = new WebGLRenderer({
      canvas: this.canvas,
      alpha: false,
      antialias: !this.isMobile,
      powerPreference: 'high-performance',
    });
    this.contextLostHandler = (event: Event) => event.preventDefault();
    this.renderer.domElement.addEventListener('webglcontextlost', this.contextLostHandler);
    this.renderer.setClearColor(0x02040b, 1);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.isMobile ? 1.4 : 2));

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloomPass = new UnrealBloomPass(
      new Vector2(this.canvas.clientWidth, this.canvas.clientHeight),
      this.isMobile ? 0.035 : 0.055,
      0.18,
      0.76,
    );
    this.composer.addPass(this.bloomPass);
    this.composer.addPass(new OutputPass());
    this.applyBrightness();

    this.globeGroup.rotation.set(this.targetRotationX, this.targetRotationY, -0.05);
    this.scene.add(this.globeGroup);
    this.scene.add(this.orbitGroup);

    this.buildStarfield();
    this.buildGlobe();
    this.buildMapBorders();
    this.buildCityLights();
    this.buildFlylines();
    this.buildOuterOrbitShells();
    this.buildSatellites();
    this.buildAtmosphericVignette();
    this.bindEvents();
    this.resizeRenderer();
    this.animate();
  }

  private loadTexture(path: string): Texture {
    const texture = new TextureLoader().load(path);
    this.textures.push(texture);
    return texture;
  }

  private makeGlowTexture(inner = '#dff9ff', outer = 'rgba(0,0,0,0)'): CanvasTexture {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 128;
    const ctx = c.getContext('2d')!;
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.2, inner);
    g.addColorStop(0.55, 'rgba(64, 210, 255, 0.35)');
    g.addColorStop(1, outer);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    const texture = new CanvasTexture(c);
    texture.minFilter = LinearFilter;
    this.textures.push(texture);
    return texture;
  }

  private makeCloudTexture(): CanvasTexture {
    const c = document.createElement('canvas');
    c.width = 1024;
    c.height = 512;
    const ctx = c.getContext('2d')!;
    ctx.clearRect(0, 0, c.width, c.height);

    for (let band = 0; band < 16; band++) {
      const y = 70 + Math.random() * 370;
      const height = 18 + Math.random() * 54;
      const alpha = 0.035 + Math.random() * 0.075;
      const g = ctx.createLinearGradient(0, y - height, 0, y + height);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(0.5, `rgba(230,246,255,${alpha})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;

      ctx.beginPath();
      for (let x = -60; x <= c.width + 80; x += 32) {
        const wave = Math.sin(x * 0.017 + band * 1.7) * height * 0.34 + Math.sin(x * 0.041 + band) * height * 0.16;
        if (x === -60) {
          ctx.moveTo(x, y + wave);
        } else {
          ctx.lineTo(x, y + wave);
        }
      }
      for (let x = c.width + 80; x >= -60; x -= 32) {
        const wave = Math.sin(x * 0.017 + band * 1.7) * height * 0.34 + Math.sin(x * 0.041 + band) * height * 0.16;
        ctx.lineTo(x, y + wave + height * (0.55 + Math.random() * 0.22));
      }
      ctx.closePath();
      ctx.fill();
    }

    for (let i = 0; i < 340; i++) {
      const x = Math.random() * c.width;
      const y = Math.random() * c.height;
      const rx = 10 + Math.random() * 42;
      const ry = 2 + Math.random() * 9;
      const alpha = 0.018 + Math.random() * 0.06;
      ctx.fillStyle = `rgba(235,248,255,${alpha})`;
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new CanvasTexture(c);
    texture.minFilter = LinearFilter;
    this.textures.push(texture);
    return texture;
  }

  private buildStarfield(): void {
    const count = this.isMobile ? 700 : 1500;
    const positions = new Float32Array(count * 3);
    const alphas = new Float32Array(count);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 72;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 42;
      positions[i * 3 + 2] = -18 - Math.random() * 48;
      alphas[i] = 0.24 + Math.random() * 0.72;
      sizes[i] = 0.55 + Math.random() * 1.8;
    }

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    geometry.setAttribute('aAlpha', new Float32BufferAttribute(alphas, 1));
    geometry.setAttribute('aSize', new Float32BufferAttribute(sizes, 1));

    const material = new ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: `
        attribute float aAlpha;
        attribute float aSize;
        varying float vAlpha;
        void main() {
          vAlpha = aAlpha;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * (70.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying float vAlpha;
        void main() {
          float d = length(gl_PointCoord - 0.5) * 2.0;
          float soft = smoothstep(1.0, 0.0, d);
          float twinkle = 0.68 + sin(uTime * 1.25 + vAlpha * 32.0) * 0.32;
          gl_FragColor = vec4(0.68, 0.9, 1.0, soft * vAlpha * twinkle);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    this.animatedMaterials.push(material);
    this.scene.add(new Points(geometry, material));
  }

  private buildGlobe(): void {
    const radius = this.globeRadius;
    const earthTexture = this.loadTexture('three/globe-stream/image/Earth_DiffuseMap_2.jpg');
    const earthMaterial = new ShaderMaterial({
      uniforms: {
        uMap: { value: earthTexture },
        uDark: { value: new Color(0x020810) },
        uCyan: { value: new Color(0x0c6f8e) },
        uWarm: { value: new Color(0xff9272) },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D uMap;
        uniform vec3 uDark;
        uniform vec3 uCyan;
        uniform vec3 uWarm;
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        void main() {
          vec3 tex = texture2D(uMap, vUv).rgb;
          float lum = dot(tex, vec3(0.299, 0.587, 0.114));
          vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
          float facing = clamp(dot(normalize(vNormal), viewDirection), 0.0, 1.0);
          float rim = pow(1.0 - facing, 2.3);
          vec3 realistic = pow(tex, vec3(1.18)) * vec3(0.86, 0.92, 0.96);
          vec3 blueGrade = mix(realistic, realistic * vec3(0.54, 0.86, 1.05) + uCyan * 0.12, 0.34);
          vec3 shadow = mix(uDark, blueGrade, smoothstep(0.02, 0.72, lum));
          vec3 color = shadow * (0.34 + facing * 0.76) + rim * vec3(0.02, 0.24, 0.5) * 0.08;
          gl_FragColor = vec4(min(color, vec3(0.82)), 1.0);
        }
      `,
      transparent: false,
    });
    const earth = new Mesh(new SphereGeometry(radius, 96, 64), earthMaterial);
    this.globeGroup.add(earth);

    const ocean = new Mesh(
      new SphereGeometry(radius * 1.006, 96, 64),
      new MeshBasicMaterial({
        color: 0x063a52,
        transparent: true,
        opacity: 0.02,
        blending: AdditiveBlending,
      }),
    );
    this.globeGroup.add(ocean);

    const scanTexture = this.loadTexture('three/globe-stream/image/scanGird.png');
    const scan = new Mesh(
      new SphereGeometry(radius * 1.018, 96, 64),
      new MeshBasicMaterial({
        map: scanTexture,
        color: 0x69e7ff,
        side: DoubleSide,
        transparent: true,
        opacity: 0.045,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
    );
    this.globeGroup.add(scan);

    this.cloudShell = new Mesh(
      new SphereGeometry(radius * 1.033, 96, 64),
      new MeshBasicMaterial({
        map: this.makeCloudTexture(),
        color: 0xbfe8ff,
        transparent: true,
        opacity: 0.16,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
    );
    this.cloudShell.rotation.set(0.02, -0.12, -0.03);
    this.globeGroup.add(this.cloudShell);

    const atmosphereMaterial = new ShaderMaterial({
      uniforms: {
        uGlow: { value: new Color(0x60dfff) },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uGlow;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        void main() {
          vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
          float rim = pow(1.0 + dot(viewDirection, vNormal), 2.7);
          gl_FragColor = vec4(uGlow, rim * 0.11);
        }
      `,
      side: BackSide,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    this.globeGroup.add(new Mesh(new SphereGeometry(radius * 1.15, 96, 64), atmosphereMaterial));

    const innerGlow = new Sprite(
      new SpriteMaterial({
        map: this.makeGlowTexture('#33cfff'),
        color: 0x0f78ff,
        opacity: 0.012,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    );
    innerGlow.scale.set(radius * 3.7, radius * 3.7, 1);
    innerGlow.position.set(0, -0.15, -0.32);
    this.globeGroup.add(innerGlow);
  }

  private buildMapBorders(): void {
    const radius = this.globeRadius;
    const borderGroup = new Group();
    this.globeGroup.add(borderGroup);

    worldJSON.features.forEach((feature: any) => {
      const drawRing = (ring: number[][]) => {
        const points = ring.map(([lng, lat]) => latLngToVec3(lat, lng, radius * 1.024));
        if (points.length < 2) return;
        borderGroup.add(
          new Line(
            new BufferGeometry().setFromPoints(points),
            new LineBasicMaterial({
              color: 0x20e6ff,
              transparent: true,
              opacity: 0.24,
              blending: AdditiveBlending,
            }),
          ),
        );
      };

      if (feature.geometry.type === 'Polygon') {
        feature.geometry.coordinates.forEach(drawRing);
      } else if (feature.geometry.type === 'MultiPolygon') {
        feature.geometry.coordinates.forEach((polygon: number[][][]) => polygon.forEach(drawRing));
      }
    });
  }

  private buildCityLights(): void {
    const radius = this.globeRadius;
    const clusters = [
      { lat: 35, lng: 105, spread: 26, count: 520 },
      { lat: 23, lng: 79, spread: 18, count: 260 },
      { lat: 48, lng: 12, spread: 18, count: 360 },
      { lat: 32, lng: 43, spread: 18, count: 180 },
      { lat: 36, lng: 139, spread: 10, count: 120 },
      { lat: 1, lng: 103, spread: 12, count: 140 },
      { lat: 30, lng: 31, spread: 12, count: 110 },
    ];
    const count = clusters.reduce((sum, c) => sum + c.count, 0);
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const alphas = new Float32Array(count);
    let i = 0;

    clusters.forEach((cluster) => {
      for (let c = 0; c < cluster.count; c++) {
        const lat = cluster.lat + (Math.random() - 0.5) * cluster.spread;
        const lng = cluster.lng + (Math.random() - 0.5) * cluster.spread * 1.5;
        const p = latLngToVec3(lat, lng, radius * 1.028);
        positions[i * 3] = p.x;
        positions[i * 3 + 1] = p.y;
        positions[i * 3 + 2] = p.z;
        sizes[i] = 0.24 + Math.random() * 0.58;
        alphas[i] = 0.08 + Math.random() * 0.22;
        i++;
      }
    });

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    geometry.setAttribute('aSize', new Float32BufferAttribute(sizes, 1));
    geometry.setAttribute('aAlpha', new Float32BufferAttribute(alphas, 1));

    const material = new ShaderMaterial({
      vertexShader: `
        attribute float aSize;
        attribute float aAlpha;
        varying float vAlpha;
        void main() {
          vAlpha = aAlpha;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * (34.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying float vAlpha;
        void main() {
          float d = length(gl_PointCoord - 0.5) * 2.0;
          float soft = smoothstep(1.0, 0.0, d);
          vec3 warm = mix(vec3(0.14, 0.95, 1.0), vec3(1.0, 0.62, 0.38), vAlpha);
          gl_FragColor = vec4(warm, soft * vAlpha * 0.28);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    this.globeGroup.add(new Points(geometry, material));
  }

  private buildFlylines(): void {
    const radius = this.globeRadius;
    const hub = { lat: 31.2, lng: 104.1 };
    const nodes = [
      { lat: 39.9, lng: 116.4 },
      { lat: 35.7, lng: 139.7 },
      { lat: 22.3, lng: 114.1 },
      { lat: 1.35, lng: 103.8 },
      { lat: 28.6, lng: 77.2 },
      { lat: 55.7, lng: 37.6 },
      { lat: 51.5, lng: -0.1 },
      { lat: 48.8, lng: 2.3 },
      { lat: 40.7, lng: -74.0 },
      { lat: -33.9, lng: 151.2 },
      { lat: 25.2, lng: 55.3 },
    ];

    const hubPosition = latLngToVec3(hub.lat, hub.lng, radius * 1.06);
    const hubTexture = this.makeGlowTexture('#e8feff');
    const hubSprite = new Sprite(
      new SpriteMaterial({
        map: hubTexture,
        color: 0xa4fbff,
        opacity: 0.38,
        transparent: true,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
    );
    hubSprite.position.copy(hubPosition);
    hubSprite.scale.set(0.22, 0.22, 1);
    this.globeGroup.add(hubSprite);

    for (let i = 0; i < 3; i++) {
      const ring = new Mesh(
        new RingGeometry(0.08, 0.1, 80),
        new MeshBasicMaterial({
          color: 0xcdfdff,
          transparent: true,
          opacity: 0.3,
          blending: AdditiveBlending,
          side: DoubleSide,
          depthWrite: false,
        }),
      );
      ring.position.copy(hubPosition);
      ring.quaternion.setFromUnitVectors(new Vector3(0, 0, 1), hubPosition.clone().normalize());
      this.globeGroup.add(ring);
      this.pulseRings.push({ mesh: ring, phase: i / 3, speed: 0.22 + i * 0.045 });
    }

    nodes.forEach((node, index) => {
      const start = hubPosition.clone();
      const end = latLngToVec3(node.lat, node.lng, radius * 1.055);
      const mid = start.clone().add(end).multiplyScalar(0.5);
      const distance = start.distanceTo(end);
      const control = mid.normalize().multiplyScalar(radius + distance * 0.68);
      const curve = new QuadraticBezierCurve3(start, control, end);
      const pathPoints = curve.getPoints(96);

      this.globeGroup.add(
        new Line(
          new BufferGeometry().setFromPoints(pathPoints),
          new LineBasicMaterial({
            color: 0x67e8ff,
            transparent: true,
            opacity: index % 3 === 0 ? 0.24 : 0.13,
            blending: AdditiveBlending,
          }),
        ),
      );

      const streamLength = 34;
      const positions = new Float32Array(streamLength * 3);
      const sizes = new Float32Array(streamLength);
      const alphas = new Float32Array(streamLength);
      for (let i = 0; i < streamLength; i++) {
        sizes[i] = 1.0 - (i / streamLength) * 0.72;
        alphas[i] = 1.0 - i / streamLength;
      }
      const geometry = new BufferGeometry();
      geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
      geometry.setAttribute('aSize', new Float32BufferAttribute(sizes, 1));
      geometry.setAttribute('aAlpha', new Float32BufferAttribute(alphas, 1));

      const material = new ShaderMaterial({
        uniforms: { uColor: { value: new Color(index % 2 ? 0x5fefff : 0xb7f7ff) } },
        vertexShader: `
          attribute float aSize;
          attribute float aAlpha;
          varying float vAlpha;
          void main() {
            vAlpha = aAlpha;
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = (3.0 + aSize * 7.0) * (32.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
          }
        `,
        fragmentShader: `
          uniform vec3 uColor;
          varying float vAlpha;
          void main() {
            float d = length(gl_PointCoord - 0.5) * 2.0;
            float soft = smoothstep(1.0, 0.0, d);
            gl_FragColor = vec4(uColor, soft * vAlpha * 0.42);
          }
        `,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      });
      this.globeGroup.add(new Points(geometry, material));
      this.streams.push({
        curve,
        geometry,
        speed: 0.11 + (index % 5) * 0.018,
        offset: index * 0.089,
        length: streamLength,
      });
    });
  }

  private buildOuterOrbitShells(): void {
    const radius = this.globeRadius;
    const orbitMaterialA = new LineBasicMaterial({
      color: 0x73efff,
      transparent: true,
      opacity: 0.18,
      blending: AdditiveBlending,
    });
    const orbitMaterialB = new LineBasicMaterial({
      color: 0x446dff,
      transparent: true,
      opacity: 0.12,
      blending: AdditiveBlending,
    });

    for (let i = 0; i < 13; i++) {
      const ring = new Line(
        new BufferGeometry().setFromPoints(circularPoints(radius * (1.18 + i * 0.025))),
        i % 2 === 0 ? orbitMaterialA.clone() : orbitMaterialB.clone(),
      );
      ring.rotation.set(
        Math.PI / 2 + (Math.random() - 0.5) * 0.55,
        (i / 13) * Math.PI + 0.25,
        (Math.random() - 0.5) * 0.72,
      );
      this.orbitGroup.add(ring);
    }
  }

  private buildSatellites(): void {
    const radius = this.globeRadius;
    const bodyGeometry = new BoxGeometry(0.08, 0.055, 0.055);
    const panelGeometry = new BoxGeometry(0.17, 0.006, 0.045);
    const bodyMaterial = new MeshBasicMaterial({
      color: 0xb8efff,
      transparent: true,
      opacity: 0.82,
    });
    const panelMaterial = new MeshBasicMaterial({
      color: 0x2d78ff,
      transparent: true,
      opacity: 0.46,
      blending: AdditiveBlending,
      depthWrite: false,
    });
    const trailMaterial = new LineBasicMaterial({
      color: 0x63e9ff,
      transparent: true,
      opacity: 0.2,
      blending: AdditiveBlending,
    });

    const specs = [
      { radius: 1.52, speed: 0.26, phase: 0.2, tiltX: 0.72, tiltY: 0.18, tiltZ: 0.26, scale: 1.0 },
      { radius: 1.62, speed: -0.18, phase: 2.4, tiltX: 1.18, tiltY: -0.28, tiltZ: -0.52, scale: 0.82 },
      { radius: 1.43, speed: 0.22, phase: 4.3, tiltX: 0.36, tiltY: 0.72, tiltZ: 0.88, scale: 0.72 },
      { radius: 1.7, speed: -0.13, phase: 5.5, tiltX: 1.42, tiltY: 0.34, tiltZ: 0.18, scale: 0.58 },
    ];

    specs.forEach((spec) => {
      const group = new Group();
      const body = new Mesh(bodyGeometry, bodyMaterial.clone());
      const leftPanel = new Mesh(panelGeometry, panelMaterial.clone());
      const rightPanel = new Mesh(panelGeometry, panelMaterial.clone());
      leftPanel.position.x = -0.13;
      rightPanel.position.x = 0.13;
      group.add(body, leftPanel, rightPanel);
      group.scale.setScalar(spec.scale);
      this.orbitGroup.add(group);

      const trail = new BufferGeometry();
      const trailPositions = new Float32Array(24 * 3);
      trail.setAttribute('position', new Float32BufferAttribute(trailPositions, 3));
      this.orbitGroup.add(new Line(trail, trailMaterial.clone()));

      this.satellites.push({
        group,
        trail,
        radius: radius * spec.radius,
        speed: spec.speed,
        phase: spec.phase,
        tiltX: spec.tiltX,
        tiltY: spec.tiltY,
        tiltZ: spec.tiltZ,
        scale: spec.scale,
      });
    });
  }

  private satellitePoint(satellite: Satellite, angle: number): Vector3 {
    const p = new Vector3(Math.cos(angle) * satellite.radius, 0, Math.sin(angle) * satellite.radius);
    p.applyAxisAngle(new Vector3(1, 0, 0), satellite.tiltX);
    p.applyAxisAngle(new Vector3(0, 1, 0), satellite.tiltY);
    p.applyAxisAngle(new Vector3(0, 0, 1), satellite.tiltZ);
    return p;
  }

  private buildAtmosphericVignette(): void {
    const glow = new Sprite(
      new SpriteMaterial({
        map: this.makeGlowTexture('#1c91ff'),
        color: 0x134dff,
        opacity: 0.035,
        transparent: true,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
    );
    glow.position.set(0, 0, -9);
    glow.scale.set(10, 6, 1);
    this.scene.add(glow);
  }

  private bindEvents(): void {
    this.resizeHandler = () => this.resizeRenderer();
    window.addEventListener('resize', this.resizeHandler);

    this.pointerMoveHandler = (event: PointerEvent) => {
      this.pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
      this.pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
      if (!this.isDragging) return;
      const dx = event.clientX - this.lastDragX;
      const dy = event.clientY - this.lastDragY;
      this.lastDragX = event.clientX;
      this.lastDragY = event.clientY;
      this.targetRotationY += dx * 0.006;
      this.targetRotationX += dy * 0.004;
      this.targetRotationX = Math.max(-1.1, Math.min(0.95, this.targetRotationX));
      event.preventDefault();
    };
    this.pointerDownHandler = (event: PointerEvent) => {
      if (event.button !== 0) return;
      this.rotationControlActive = false;
      this.isDragging = true;
      this.lastDragX = event.clientX;
      this.lastDragY = event.clientY;
      this.canvas.setPointerCapture?.(event.pointerId);
    };
    this.pointerUpHandler = (event: PointerEvent) => {
      this.isDragging = false;
      this.canvas.releasePointerCapture?.(event.pointerId);
    };
    window.addEventListener('pointermove', this.pointerMoveHandler, { passive: false });
    this.canvas.addEventListener('pointerdown', this.pointerDownHandler);
    window.addEventListener('pointerup', this.pointerUpHandler);
  }

  private resizeRenderer(): void {
    const parent = this.canvas.parentElement;
    if (!parent || !this.renderer || !this.camera || !this.composer) return;
    const width = parent.clientWidth || window.innerWidth;
    const height = parent.clientHeight || window.innerHeight;
    this.renderer.setSize(width, height, false);
    this.composer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  private animate(): void {
    if (this.disposed) return;
    this.animationId = requestAnimationFrame(() => this.animate());

    const elapsed = this.clock.getElapsedTime();
    const speed = this.reduceMotion ? 0.08 : 1;
    const cinematicZoom = Math.sin(elapsed * 0.19) * (this.isMobile ? 0.32 : 0.42);
    this.camera.position.z = (this.isMobile ? 7.2 : 8.6) + cinematicZoom + this.zoomOffset;
    this.camera.position.x += (this.pointer.x * 0.18 - this.camera.position.x) * 0.028 * speed;
    this.camera.position.y += (0.22 + this.pointer.y * 0.08 - this.camera.position.y) * 0.028 * speed;
    this.camera.lookAt(0, 0.05, 0);

    if (!this.isDragging && !this.rotationControlActive) {
      this.targetRotationY += 0.0019 * speed;
      this.targetRotationX += (-0.08 + this.pointer.y * 0.035 - this.targetRotationX) * 0.008 * speed;
    }
    this.globeGroup.rotation.y += (this.targetRotationY - this.globeGroup.rotation.y) * 0.09;
    this.globeGroup.rotation.x += (this.targetRotationX - this.globeGroup.rotation.x) * 0.09;
    this.orbitGroup.rotation.y -= 0.0026 * speed;
    this.orbitGroup.rotation.z = Math.sin(elapsed * 0.18) * 0.035;
    if (this.cloudShell) {
      this.cloudShell.rotation.y += 0.00045 * speed;
      this.cloudShell.rotation.z = -0.03 + Math.sin(elapsed * 0.12) * 0.008;
      (this.cloudShell.material as MeshBasicMaterial).opacity = 0.13 + Math.sin(elapsed * 0.22) * 0.025;
    }

    this.animatedMaterials.forEach((material) => {
      material.uniforms.uTime.value = elapsed;
    });

    this.streams.forEach((stream) => {
      const attr = stream.geometry.getAttribute('position') as Float32BufferAttribute;
      for (let i = 0; i < stream.length; i++) {
        const t = (((elapsed * stream.speed * speed + stream.offset - i * 0.0065) % 1) + 1) % 1;
        const p = stream.curve.getPoint(t);
        attr.setXYZ(i, p.x, p.y, p.z);
      }
      attr.needsUpdate = true;
    });

    this.pulseRings.forEach((ring) => {
      ring.phase = (ring.phase + ring.speed * 0.012 * speed) % 1;
      const scale = 0.45 + ring.phase * 4.6;
      ring.mesh.scale.setScalar(scale);
      (ring.mesh.material as MeshBasicMaterial).opacity = (1 - ring.phase) * 0.72;
    });

    this.satellites.forEach((satellite) => {
      const angle = elapsed * satellite.speed * speed + satellite.phase;
      const position = this.satellitePoint(satellite, angle);
      satellite.group.position.copy(position);
      const tangent = this.satellitePoint(satellite, angle + 0.018).sub(position).normalize();
      satellite.group.quaternion.setFromUnitVectors(new Vector3(1, 0, 0), tangent);

      const attr = satellite.trail.getAttribute('position') as Float32BufferAttribute;
      for (let i = 0; i < 24; i++) {
        const p = this.satellitePoint(satellite, angle - i * 0.018 * Math.sign(satellite.speed || 1));
        attr.setXYZ(i, p.x, p.y, p.z);
      }
      attr.needsUpdate = true;
    });

    this.composer.render();
  }

  setManualRotationDegrees(degrees: number): void {
    this.rotationControlActive = true;
    this.targetRotationY = Math.PI * 1.18 + (degrees % 360) * DEG;
  }

  setBrightnessPercent(value: number): void {
    this.brightnessPercent = Math.max(25, Math.min(82, value));
    this.applyBrightness();
  }

  private applyBrightness(): void {
    if (!this.bloomPass) return;
    const normalized = this.brightnessPercent / 100;
    const baseStrength = this.isMobile ? 0.035 : 0.055;
    this.bloomPass.strength = baseStrength * (0.32 + normalized * 0.92);
    this.bloomPass.threshold = 0.76 + (1 - normalized) * 0.11;
    this.bloomPass.radius = 0.13 + normalized * 0.09;
  }

  zoomIn(): void {
    this.setZoomOffset(this.zoomOffset - 0.42);
  }

  zoomOut(): void {
    this.setZoomOffset(this.zoomOffset + 0.42);
  }

  private setZoomOffset(value: number): void {
    this.zoomOffset = Math.max(-1.65, Math.min(2.2, value));
  }

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
    this.pause();
    window.removeEventListener('resize', this.resizeHandler);
    window.removeEventListener('pointermove', this.pointerMoveHandler);
    this.canvas.removeEventListener('pointerdown', this.pointerDownHandler);
    window.removeEventListener('pointerup', this.pointerUpHandler);
    if (this.contextLostHandler) {
      this.renderer.domElement.removeEventListener('webglcontextlost', this.contextLostHandler);
      this.contextLostHandler = null;
    }

    this.scene.traverse((object: any) => {
      object.geometry?.dispose?.();
      if (Array.isArray(object.material)) {
        object.material.forEach((material: any) => material.dispose?.());
      } else {
        object.material?.dispose?.();
      }
    });
    this.textures.forEach((texture) => texture.dispose());
    this.composer.dispose();
    this.renderer.dispose();
    this.streams = [];
    this.pulseRings = [];
    this.satellites = [];
    this.cloudShell = null;
    this.animatedMaterials = [];
  }
}
