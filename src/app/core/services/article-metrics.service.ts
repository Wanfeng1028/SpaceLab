/**
 * Article metrics service — tracks views and likes per article.
 *
 * Currently uses localStorage as a local fallback.
 * When Supabase is configured, this service will be extended to sync with Supabase.
 */
import { Injectable, signal, computed } from '@angular/core';

export interface ArticleMetrics {
  slug: string;
  viewCount: number;
  likeCount: number;
}

const STORAGE_KEY = 'spacelab_article_metrics';

function loadFromStorage(): Record<string, ArticleMetrics> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveToStorage(data: Record<string, ArticleMetrics>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // localStorage full or unavailable — silently ignore
  }
}

@Injectable({ providedIn: 'root' })
export class ArticleMetricsService {
  private _metrics = signal<Record<string, ArticleMetrics>>(loadFromStorage());

  /** All metrics as a signal */
  readonly metrics = computed(() => Object.values(this._metrics()));

  /** Metrics for a specific slug */
  getMetrics(slug: string): ArticleMetrics | undefined {
    return this._metrics()[slug];
  }

  /**
   * Record a view for the given slug.
   * In production (Supabase), this would POST to /api/metrics/view.
   */
  trackView(slug: string): void {
    const current = this._metrics()[slug] ?? { slug, viewCount: 0, likeCount: 0 };
    const updated = { ...current, viewCount: current.viewCount + 1 };
    const next = { ...this._metrics(), [slug]: updated };
    this._metrics.set(next);
    saveToStorage(next);
  }

  /**
   * Toggle a like for the given slug.
   * In production (Supabase), this would POST to /api/metrics/like.
   */
  toggleLike(slug: string): void {
    const current = this._metrics()[slug] ?? { slug, viewCount: 0, likeCount: 0 };
    const updated = { ...current, likeCount: current.likeCount + 1 };
    const next = { ...this._metrics(), [slug]: updated };
    this._metrics.set(next);
    saveToStorage(next);
  }

  /**
   * Initialize metrics from Supabase (or any remote source).
   * Called on app init or when Supabase is configured.
   */
  async syncFromRemote(metrics: ArticleMetrics[]): Promise<void> {
    const next: Record<string, ArticleMetrics> = {};
    for (const m of metrics) {
      next[m.slug] = m;
    }
    this._metrics.set(next);
    saveToStorage(next);
  }
}
