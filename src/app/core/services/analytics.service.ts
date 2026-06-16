import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
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

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  getSummary(): Observable<AnalyticsSummary> {
    return this.http.get<AnalyticsSummary>(`${this.apiUrl}/analytics/summary`);
  }

  getTopPosts(limit = 10): Observable<TopPost[]> {
    return this.http.get<TopPost[]>(`${this.apiUrl}/analytics/top-posts`, {
      params: { limit: limit.toString() },
    });
  }

  getTrafficTrend(days = 7): Observable<TrafficTrend> {
    return this.http.get<TrafficTrend>(`${this.apiUrl}/analytics/traffic`, {
      params: { days: days.toString() },
    });
  }
}
