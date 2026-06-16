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
      error: () => this.loading.set(false),
    });
  }

  go(path: string): void {
    this.router.navigate([path]);
  }

  private loadHealth(): void {
    this.http.get<HealthStatus>(`${this.apiUrl.replace('/api/v1', '')}/health`).subscribe({
      next: (h) => this.health.set(h),
      error: () => { /* 静默 */ },
    });
  }
}
