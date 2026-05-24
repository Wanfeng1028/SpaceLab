import {
  Component,
  inject,
  signal,
  OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { I18nService } from '../../core/services/i18n.service';

interface ArticleData {
  title: string;
  slug: string;
  date: string;
  tags: string[];
  readingTime: number;
  content: string;
  prevSlug: string | null;
  prevTitle: string | null;
  nextSlug: string | null;
  nextTitle: string | null;
}

@Component({
  selector: 'app-article',
  templateUrl: './article.html',
  styleUrl: './article.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
})
export class ArticleComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private i18n = inject(I18nService);

  readonly article = signal<ArticleData | null>(null);

  // 示例文章数据 — 后续由 Supabase 替换
  private readonly articlesMap: Record<string, ArticleData> = {
    'hello-world': {
      title: '你好，世界',
      slug: 'hello-world',
      date: '2025-05-24',
      tags: ['随笔', '建站'],
      readingTime: 3,
      content: `
        <p>欢迎来到 SpaceLab — 我的个人数字空间。</p>
        <p>这里将记录我在技术探索中的思考、项目经验和生活感悟。作为一个热爱前端技术和 3D 可视化的开发者，我希望建立一个既能展示作品，又能分享知识的空间。</p>
        <h2>为什么叫 SpaceLab？</h2>
        <p>SpaceLab 的灵感来源于"太空实验室"——一个充满探索精神的地方。在这里，我像一个实验者一样，不断尝试新技术、新想法，记录每一次实验的过程和结果。</p>
        <h2>技术栈</h2>
        <p>这个网站基于以下技术构建：</p>
        <ul>
          <li><strong>Angular 21</strong> — 现代化的前端框架</li>
          <li><strong>Three.js</strong> — 3D 图形渲染</li>
          <li><strong>GSAP</strong> — 高性能动画库</li>
          <li><strong>Glassmorphism</strong> — 玻璃拟态设计风格</li>
        </ul>
        <h2>未来计划</h2>
        <p>在接下来的日子里，我计划：</p>
        <ol>
          <li>完善博客系统，支持 Markdown 渲染</li>
          <li>添加 3D 互动实验</li>
          <li>建立项目展示区</li>
          <li>集成访问分析系统</li>
        </ol>
        <p>期待与你一起探索这个数字空间 ✨</p>
      `,
      prevSlug: null,
      prevTitle: null,
      nextSlug: 'angular-21-overview',
      nextTitle: 'Angular 21 新特性速览',
    },
    'angular-21-overview': {
      title: 'Angular 21 新特性速览',
      slug: 'angular-21-overview',
      date: '2025-05-20',
      tags: ['Angular', '前端'],
      readingTime: 5,
      content: `
        <p>Angular 21 带来了许多令人兴奋的新特性，让我们一起来看看最重要的变化。</p>
        <h2>信号系统 (Signals)</h2>
        <p>Angular 的信号系统现在更加成熟，提供了更好的性能和更简洁的 API。信号是响应式原语，可以用来管理状态并自动触发变更检测。</p>
        <pre><code>const count = signal(0);
console.log(count()); // 0
count.set(5);
console.log(count()); // 5</code></pre>
        <h2>改进的变更检测</h2>
        <p>Angular 21 进一步优化了变更检测机制，减少了不必要的组件重渲染，提升了整体性能。</p>
        <h2>更好的开发体验</h2>
        <p>新的 CLI 命令、改进的错误提示和更好的类型推断，让开发过程更加顺畅。</p>
        <blockquote><p>Angular 21 是一个重要的版本，标志着 Angular 向更加现代化、高性能的方向迈进了重要一步。</p></blockquote>
      `,
      prevSlug: 'hello-world',
      prevTitle: '你好，世界',
      nextSlug: 'threejs-particles',
      nextTitle: 'Three.js 粒子系统入门',
    },
    'threejs-particles': {
      title: 'Three.js 粒子系统入门',
      slug: 'threejs-particles',
      date: '2025-05-15',
      tags: ['Three.js', 'WebGL', '3D'],
      readingTime: 8,
      content: `
        <p>使用 Three.js 创建粒子效果是 Web 3D 开发中最有趣的部分之一。本文将带你从零开始构建一个完整的粒子系统。</p>
        <h2>什么是粒子系统？</h2>
        <p>粒子系统是一种图形技术，用于模拟大量小物体的行为。在 Three.js 中，我们使用 <code>Points</code> 和 <code>BufferGeometry</code> 来高效渲染粒子。</p>
        <h2>基础实现</h2>
        <pre><code>const geometry = new THREE.BufferGeometry();
const positions = new Float32Array(count * 3);

for (let i = 0; i < count; i++) {
  positions[i * 3] = Math.random() * 100 - 50;
  positions[i * 3 + 1] = Math.random() * 100 - 50;
  positions[i * 3 + 2] = Math.random() * 100 - 50;
}

geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

const material = new THREE.PointsMaterial({ size: 0.5, color: 0xffffff });
const particles = new THREE.Points(geometry, material);
scene.add(particles);</code></pre>
        <h2>添加动画</h2>
        <p>通过在 <code>requestAnimationFrame</code> 循环中更新粒子位置，我们可以创建各种动态效果。</p>
        <h2>优化技巧</h2>
        <ul>
          <li>使用 <code>BufferGeometry</code> 而非 <code>Geometry</code></li>
          <li>控制粒子数量，移动端使用更少的粒子</li>
          <li>使用 <code>AdditiveBlending</code> 增强视觉效果</li>
          <li>在离开视口时暂停渲染</li>
        </ul>
      `,
      prevSlug: 'angular-21-overview',
      prevTitle: 'Angular 21 新特性速览',
      nextSlug: 'glassmorphism-guide',
      nextTitle: 'Glassmorphism 设计指南',
    },
    'glassmorphism-guide': {
      title: 'Glassmorphism 设计指南',
      slug: 'glassmorphism-guide',
      date: '2025-05-10',
      tags: ['设计', 'CSS'],
      readingTime: 6,
      content: `
        <p>玻璃拟态（Glassmorphism）是一种流行的 UI 设计风格，通过半透明、模糊和微妙的边框创造出玻璃般的质感。</p>
        <h2>核心要素</h2>
        <ul>
          <li><strong>半透明背景</strong> — 使用 <code>rgba</code> 或 <code>hsla</code> 设置透明度</li>
          <li><strong>背景模糊</strong> — <code>backdrop-filter: blur()</code></li>
          <li><strong>微妙边框</strong> — 细微的半透明边框增加层次感</li>
          <li><strong>柔和阴影</strong> — 营造悬浮感</li>
        </ul>
        <h2>CSS 实现</h2>
        <pre><code>.glass-card {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(12px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}</code></pre>
        <h2>设计建议</h2>
        <p>不要过度使用模糊效果，保持界面的可读性。在深色背景上使用玻璃效果通常能获得更好的视觉效果。</p>
      `,
      prevSlug: 'threejs-particles',
      prevTitle: 'Three.js 粒子系统入门',
      nextSlug: 'dev-tools-2025',
      nextTitle: '我的开发工具箱 2025',
    },
    'dev-tools-2025': {
      title: '我的开发工具箱 2025',
      slug: 'dev-tools-2025',
      date: '2025-05-05',
      tags: ['工具', '效率'],
      readingTime: 4,
      content: `
        <p>分享我在 2025 年日常使用的开发工具和效率技巧。</p>
        <h2>编辑器</h2>
        <p>VS Code 依然是我的主力编辑器，配合以下插件使用：</p>
        <ul>
          <li>Copilot — AI 辅助编码</li>
          <li>Error Lens — 内联错误显示</li>
          <li>GitLens — Git 增强</li>
        </ul>
        <h2>终端</h2>
        <p>Windows Terminal + Oh My Posh，自定义主题让终端不再枯燥。</p>
        <h2>浏览器</h2>
        <p>Chrome DevTools 是前端开发的必备工具，特别是 Performance 和 Lighthouse 面板。</p>
        <h2>效率工具</h2>
        <ul>
          <li>Raycast — 快速启动和搜索</li>
          <li>Notion — 笔记和项目管理</li>
          <li>Figma — 设计协作</li>
        </ul>
      `,
      prevSlug: 'glassmorphism-guide',
      prevTitle: 'Glassmorphism 设计指南',
      nextSlug: null,
      nextTitle: null,
    },
  };

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      const slug = params['slug'];
      const data = this.articlesMap[slug];
      if (data) {
        this.article.set(data);
      }
    });
  }

  t(key: string): string {
    return this.i18n.t(key);
  }
}
