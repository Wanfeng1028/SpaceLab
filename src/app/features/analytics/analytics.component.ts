import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { I18nService } from '../../core/services/i18n.service';
import { PulseMetricComponent } from '../../shared/components/pulse-metric/pulse-metric.component';

@Component({
  selector: 'app-analytics',
  templateUrl: './analytics.html',
  styleUrl: './analytics.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PulseMetricComponent],
})
export class AnalyticsComponent {
  private i18n = inject(I18nService);

  readonly metrics = [
    { value: '1,234', label: '总访问量' },
    { value: '89', label: '今日访问' },
    { value: '567', label: '本周访问' },
    { value: '45', label: '独立访客' },
  ];

  readonly topPages = [
    { path: '/', views: 320, title: '首页' },
    { path: '/blog', views: 185, title: '博客列表' },
    { path: '/article/hello-world', views: 142, title: '你好，世界' },
    { path: '/projects', views: 98, title: '项目展示' },
    { path: '/article/angular-21-overview', views: 76, title: 'Angular 21 新特性' },
  ];

  readonly topArticles = [
    { title: '你好，世界', slug: 'hello-world', views: 142, date: '2025-05-24' },
    { title: 'Angular 21 新特性速览', slug: 'angular-21-overview', views: 76, date: '2025-05-20' },
    { title: 'Three.js 粒子系统入门', slug: 'threejs-particles', views: 58, date: '2025-05-15' },
    { title: 'Glassmorphism 设计指南', slug: 'glassmorphism-guide', views: 45, date: '2025-05-10' },
    { title: '我的开发工具箱 2025', slug: 'dev-tools-2025', views: 32, date: '2025-05-05' },
  ];

  readonly trendData = [45, 52, 38, 65, 72, 58, 89]; // 最近 7 天

  t(key: string): string {
    return this.i18n.t(key);
  }

  getMaxViews(): number {
    return Math.max(...this.trendData);
  }

  getBarHeight(value: number): number {
    return (value / this.getMaxViews()) * 100;
  }
}
