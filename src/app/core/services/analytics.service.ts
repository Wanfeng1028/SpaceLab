import { Injectable, signal } from '@angular/core';
import type { AnalyticsEventType, SitePulse } from '../models';

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly _pulse = signal<SitePulse | null>(null);
  private readonly _loading = signal(false);

  readonly pulse = this._pulse.asReadonly();
  readonly loading = this._loading.asReadonly();

  async trackEvent(_eventType: AnalyticsEventType, _data?: Record<string, string>): Promise<void> {
    // TODO: integrate with Supabase analytics_events
  }

  async fetchSitePulse(): Promise<void> {
    this._loading.set(true);
    try {
      // TODO: integrate with Supabase
      this._pulse.set({
        totalVisits: 0,
        todayVisits: 0,
        topPages: [],
        topArticles: [],
        trend: [],
      });
    } finally {
      this._loading.set(false);
    }
  }
}
