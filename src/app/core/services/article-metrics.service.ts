/**
 * Article metrics service — tracks views and likes via backend API.
 * Falls back to localStorage when the API is unavailable.
 */
import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

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
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;
  private _metrics = signal<Record<string, ArticleMetrics>>(loadFromStorage());

  /** All metrics as a signal */
  readonly metrics = computed(() => Object.values(this._metrics()));

  /** Metrics for a specific slug */
  getMetrics(slug: string): ArticleMetrics | undefined {
    return this._metrics()[slug];
  }

  /**
   * Record a view for the given slug.
   * Calls backend API to increment view count, updates local cache.
   */
  trackView(slug: string): void {
    // Update local cache optimistically
    const current = this._metrics()[slug] ?? { slug, viewCount: 0, likeCount: 0 };
    const updated = { ...current, viewCount: current.viewCount + 1 };
    const next = { ...this._metrics(), [slug]: updated };
    this._metrics.set(next);
    saveToStorage(next);

    // Sync with backend
    this.http.post(`${this.apiUrl}/posts/${slug}/view`, {}).subscribe({
      error: () => {
        // Backend sync failed — local cache still valid
      },
    });
  }

  /**
   * Toggle a like for the given slug.
   * Currently uses local storage; backend like API can be added later.
   */
  toggleLike(slug: string): void {
    const current = this._metrics()[slug] ?? { slug, viewCount: 0, likeCount: 0 };
    const updated = { ...current, likeCount: current.likeCount + 1 };
    const next = { ...this._metrics(), [slug]: updated };
    this._metrics.set(next);
    saveToStorage(next);
  }

  /**
   * Initialize metrics from remote source.
   * Called on app init or when backend is configured.
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
