import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzStatisticModule } from 'ng-zorro-antd/statistic';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

interface SiteStats {
  posts: { total: number; published: number; drafts: number; views: number };
  projects: number;
  comments: { total: number; pending: number };
  users: { total: number; active: number; banned: number; recent: number };
  ai_news: number;
  ai_tools: number;
}

interface HealthStatus {
  status: string;
  checks?: { database: string; redis: string };
}

/* ── Mock Data ──────────────────────────────────────────────────────── */

const MOCK_STATS: SiteStats = {
  posts: { total: 28, published: 22, drafts: 6, views: 12847 },
  projects: 5,
  comments: { total: 156, pending: 8 },
  users: { total: 42, active: 38, banned: 2, recent: 7 },
  ai_news: 14,
  ai_tools: 9,
};

const MOCK_HEALTH: HealthStatus = {
  status: 'ok',
  checks: { database: 'up', redis: 'up' },
};

@Component({
  selector: 'app-admin-dashboard',
  imports: [RouterLink, NzCardModule, NzStatisticModule, NzButtonModule, NzIconModule, NzGridModule],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDashboardComponent implements OnInit {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;
  private router = inject(Router);

  readonly stats = signal<SiteStats | null>(null);
  readonly health = signal<HealthStatus | null>(null);
  readonly loading = signal(false);

  ngOnInit(): void {
    this.loadStats();
    this.loadHealth();
  }

  private loadStats(): void {
    this.loading.set(true);
    this.http.get<SiteStats>(`${this.apiUrl}/admin/stats/site`).subscribe({
      next: (s) => { this.stats.set(s); this.loading.set(false); },
      error: () => { this.stats.set(MOCK_STATS); this.loading.set(false); },
    });
  }

  go(path: string): void {
    this.router.navigate([path]);
  }

  private loadHealth(): void {
    this.http.get<HealthStatus>(`${this.apiUrl.replace('/api/v1', '')}/health`).subscribe({
      next: (h) => this.health.set(h),
      error: () => this.health.set(MOCK_HEALTH),
    });
  }
}
