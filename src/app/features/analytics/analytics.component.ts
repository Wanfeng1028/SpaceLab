import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { I18nService } from '../../core/services/i18n.service';
import { PulseMetricComponent } from '../../shared/components/pulse-metric/pulse-metric.component';
import { AnalyticsService, AnalyticsSummary, TopPost, TrafficDay } from '../../core/services/analytics.service';

@Component({
  selector: 'app-analytics',
  templateUrl: './analytics.html',
  styleUrl: './analytics.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PulseMetricComponent],
})
export class AnalyticsComponent implements OnInit {
  private i18n = inject(I18nService);
  private analyticsService = inject(AnalyticsService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly summary = signal<AnalyticsSummary | null>(null);
  readonly topPosts = signal<TopPost[]>([]);
  readonly traffic = signal<TrafficDay[]>([]);

  readonly metrics = computed(() => {
    const s = this.summary();
    if (!s) return [];
    return [
      { value: this.fmt(s.total_views), key: 'totalVisits' },
      { value: this.fmt(s.today_views), key: 'todayVisits' },
      { value: this.fmt(s.week_views), key: 'weekVisits' },
      { value: this.fmt(s.month_views), key: 'monthVisits' },
    ].map((m) => ({
      value: m.value,
      label: this.i18n.t(`analytics.${m.key}`),
    }));
  });

  readonly trendData = computed(() => this.traffic().map((d) => d.views));

  ngOnInit(): void {
    this.loadData();
  }

  private loadData(): void {
    this.loading.set(true);
    this.error.set(null);

    this.analyticsService.getSummary().subscribe({
      next: (s) => {
        this.summary.set(s);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('加载分析数据失败');
        this.loading.set(false);
      },
    });

    this.analyticsService.getTopPosts(5).subscribe({
      next: (posts) => this.topPosts.set(posts),
      error: () => { /* 静默失败 */ },
    });

    this.analyticsService.getTrafficTrend(7).subscribe({
      next: (t) => this.traffic.set(t.trend ?? []),
      error: () => { /* 静默失败 */ },
    });
  }

  /** 格式化数字 */
  private fmt(n: number): string {
    if (n >= 10000) return (n / 10000).toFixed(1) + 'w';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
    return n.toLocaleString();
  }

  /** 获取星期标签 */
  dayLabel(index: number): string {
    const labels = ['一', '二', '三', '四', '五', '六', '日'];
    return labels[index % 7] || '';
  }

  t(key: string): string {
    return this.i18n.t(key);
  }

  getMaxViews(): number {
    return Math.max(...this.trendData(), 1);
  }

  getBarHeight(value: number): number {
    return (value / this.getMaxViews()) * 100;
  }
}
