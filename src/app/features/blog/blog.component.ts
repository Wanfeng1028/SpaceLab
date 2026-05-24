import {
  Component,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { I18nService } from '../../core/services/i18n.service';
import { ArticleCardComponent } from '../../shared/components/cards/article-card.component';

interface BlogPost {
  title: string;
  slug: string;
  excerpt: string;
  date: string;
  tags: string[];
  category: string;
}

@Component({
  selector: 'app-blog',
  templateUrl: './blog.html',
  styleUrl: './blog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, ArticleCardComponent],
})
export class BlogComponent {
  private i18n = inject(I18nService);

  readonly searchQuery = signal('');
  readonly selectedCategory = signal('all');

  readonly allPosts: BlogPost[] = [
    {
      title: '你好，世界',
      slug: 'hello-world',
      excerpt: '这是 SpaceLab 的第一篇文章，记录建站的初衷和未来的规划。从零开始搭建一个个人数字空间，记录技术与生活。',
      date: '2025-05-24',
      tags: ['随笔', '建站'],
      category: '随笔',
    },
    {
      title: 'Angular 21 新特性速览',
      slug: 'angular-21-overview',
      excerpt: 'Angular 21 带来了全新的信号系统、改进的变更检测和更好的开发体验。本文带你了解最重要的变化。',
      date: '2025-05-20',
      tags: ['Angular', '前端'],
      category: '技术',
    },
    {
      title: 'Three.js 粒子系统入门',
      slug: 'threejs-particles',
      excerpt: '使用 Three.js 创建令人惊叹的粒子效果，从基础概念到完整实现，一步步带你构建自己的粒子场。',
      date: '2025-05-15',
      tags: ['Three.js', 'WebGL', '3D'],
      category: '技术',
    },
    {
      title: 'Glassmorphism 设计指南',
      slug: 'glassmorphism-guide',
      excerpt: '玻璃拟态设计风格的完整指南，包括原理、实现方法和最佳实践。让你的 UI 拥有高级质感。',
      date: '2025-05-10',
      tags: ['设计', 'CSS'],
      category: '设计',
    },
    {
      title: '我的开发工具箱 2025',
      slug: 'dev-tools-2025',
      excerpt: '2025 年我日常使用的开发工具、编辑器配置、浏览器插件和效率工具分享。',
      date: '2025-05-05',
      tags: ['工具', '效率'],
      category: '随笔',
    },
  ];

  readonly categories = computed(() => {
    const cats = new Set(this.allPosts.map((p) => p.category));
    return ['all', ...Array.from(cats)];
  });

  readonly filteredPosts = computed(() => {
    const query = this.searchQuery().toLowerCase();
    const category = this.selectedCategory();

    return this.allPosts.filter((post) => {
      const matchesSearch =
        !query ||
        post.title.toLowerCase().includes(query) ||
        post.excerpt.toLowerCase().includes(query) ||
        post.tags.some((t) => t.toLowerCase().includes(query));

      const matchesCategory = category === 'all' || post.category === category;

      return matchesSearch && matchesCategory;
    });
  });

  t(key: string): string {
    return this.i18n.t(key);
  }

  onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
  }

  selectCategory(category: string): void {
    this.selectedCategory.set(category);
  }
}
