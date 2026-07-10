import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface AnalyticsSummary {
  total_views: number;
  today_views: number;
  week_views: number;
  month_views: number;
}

export interface TopPost {
  id: string;
  title: string;
  view_count: number;
}

export interface TrafficDay {
  date: string;
  views: number;
}

export interface TrafficTrend {
  days: number;
  trend: TrafficDay[];
}

/* ── Mock Data ──────────────────────────────────────────────────────── */

const MOCK_SUMMARY: AnalyticsSummary = {
  total_views: 12847,
  today_views: 156,
  week_views: 1023,
  month_views: 3892,
};

const MOCK_TOP_POSTS: TopPost[] = [
  { id: '1', title: 'Angular 信号 Signals 完全指南', view_count: 1234 },
  { id: '2', title: 'Three.js 着色器入门实战', view_count: 987 },
  { id: '3', title: 'Go + Gin 构建 REST API', view_count: 756 },
  { id: '4', title: 'CSS Grid 高级布局技巧', view_count: 543 },
  { id: '5', title: '大语言模型应用开发初探', view_count: 421 },
];

const MOCK_TREND: TrafficTrend = {
  days: 7,
  trend: [
    { date: '2026-07-05', views: 142 },
    { date: '2026-07-06', views: 198 },
    { date: '2026-07-07', views: 167 },
    { date: '2026-07-08', views: 234 },
    { date: '2026-07-09', views: 189 },
    { date: '2026-07-10', views: 256 },
    { date: '2026-07-11', views: 156 },
  ],
};

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  getSummary(): Observable<AnalyticsSummary> {
    return this.http.get<AnalyticsSummary>(`${this.apiUrl}/analytics/summary`).pipe(
      map((data) =>
        data.total_views === 0 && data.today_views === 0 &&
        data.week_views === 0 && data.month_views === 0
          ? MOCK_SUMMARY
          : data,
      ),
      catchError(() => of(MOCK_SUMMARY)),
    );
  }

  getTopPosts(limit = 10): Observable<TopPost[]> {
    return this.http.get<TopPost[]>(`${this.apiUrl}/analytics/top-posts`, {
      params: { limit: limit.toString() },
    }).pipe(
      map((data) => (data && data.length > 0 ? data : MOCK_TOP_POSTS.slice(0, limit))),
      catchError(() => of(MOCK_TOP_POSTS.slice(0, limit))),
    );
  }

  getTrafficTrend(days = 7): Observable<TrafficTrend> {
    return this.http.get<TrafficTrend>(`${this.apiUrl}/analytics/traffic`, {
      params: { days: days.toString() },
    }).pipe(
      map((data) => (data?.trend?.length ? data : MOCK_TREND)),
      catchError(() => of(MOCK_TREND)),
    );
  }
}
