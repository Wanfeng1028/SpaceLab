import { Component, inject, ChangeDetectionStrategy, computed } from '@angular/core';
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

  private readonly metricData = [
    { value: '1,234', key: 'totalVisits' },
    { value: '89', key: 'todayVisits' },
    { value: '567', key: 'weekVisits' },
    { value: '45', key: 'uniqueVisitors' },
  ];

  readonly metrics = computed(() =>
    this.metricData.map((m) => ({
      value: m.value,
      label: this.i18n.t(`analytics.${m.key}`),
    })),
  );

  private readonly pageData = [
    { path: '/', views: 320, key: 'page0' },
    { path: '/blog', views: 185, key: 'page1' },
    { path: '/article/hello-world', views: 142, key: 'page2' },
    { path: '/projects', views: 98, key: 'page3' },
    { path: '/article/angular-21-overview', views: 76, key: 'page4' },
  ];

  readonly topPages = computed(() =>
    this.pageData.map((p) => ({
      path: p.path,
      views: p.views,
      title: this.i18n.t(`analytics.${p.key}`),
    })),
  );

  private readonly articleData = [
    { key: 'page2', slug: 'hello-world', views: 142, date: '2025-05-24' },
    { key: 'page4', slug: 'angular-21-overview', views: 76, date: '2025-05-20' },
    { titleKey: 'archive.post2_title', slug: 'threejs-particles', views: 58, date: '2025-05-15' },
    { titleKey: 'archive.post3_title', slug: 'glassmorphism-guide', views: 45, date: '2025-05-10' },
    { titleKey: 'archive.post4_title', slug: 'dev-tools-2025', views: 32, date: '2025-05-05' },
  ];

  readonly topArticles = computed(() =>
    this.articleData.map((a) => ({
      title:
        'key' in a
          ? this.i18n.t(`analytics.${a.key}`)
          : this.i18n.t((a as { titleKey: string }).titleKey),
      slug: a.slug,
      views: a.views,
      date: a.date,
    })),
  );

  readonly trendData = [45, 52, 38, 65, 72, 58, 89];

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
