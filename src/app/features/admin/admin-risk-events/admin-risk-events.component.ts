import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

interface RiskEventItem {
  id: string;
  user_id: string;
  event_type: string;
  description: string;
  ip: string;
  metadata: string;
  resolved: boolean;
  resolved_by: string;
  created_at: string;
}

/* ── Mock Data ──────────────────────────────────────────────────────── */

const MOCK_EVENTS: RiskEventItem[] = [
  { id: 're1', user_id: 'unknown-001', event_type: 'brute_force', description: '5 分钟内连续登录失败 10 次', ip: '203.0.113.42', metadata: '{"attempts":10}', resolved: false, resolved_by: '', created_at: '2026-07-11T02:45:00Z' },
  { id: 're2', user_id: 'u5', event_type: 'suspicious_activity', description: '短时间内大量评论操作', ip: '198.51.100.77', metadata: '{"comment_count":50}', resolved: false, resolved_by: '', created_at: '2026-07-10T16:30:00Z' },
  { id: 're3', user_id: 'unknown-002', event_type: 'port_scan', description: '检测到端口扫描行为', ip: '192.0.2.100', metadata: '{"ports":"22,80,443,8080"}', resolved: true, resolved_by: 'admin', created_at: '2026-07-09T04:00:00Z' },
  { id: 're4', user_id: 'u3', event_type: 'privilege_escalation', description: '普通用户尝试访问管理接口', ip: '172.16.0.88', metadata: '{"endpoint":"/admin/users"}', resolved: true, resolved_by: 'admin', created_at: '2026-07-08T11:20:00Z' },
];

@Component({
  selector: 'app-admin-risk-events',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="risk-page">
      <h2>风险事件</h2>
      <div class="filter-bar">
        <button class="filter-btn" [class.active]="!showResolved()" (click)="showResolved.set(false); loadEvents()">未处理</button>
        <button class="filter-btn" [class.active]="showResolved()" (click)="showResolved.set(true); loadEvents()">已处理</button>
      </div>
      <div *ngIf="loading" class="loading">加载中...</div>
      <div *ngFor="let e of events()" class="event-card" [class.resolved]="e.resolved">
        <div class="event-header">
          <span class="event-type">{{ e.event_type }}</span>
          <span class="event-status" [class.resolved]="e.resolved">{{ e.resolved ? '已处理' : '待处理' }}</span>
          <span class="event-time">{{ e.created_at }}</span>
        </div>
        <div class="event-desc">{{ e.description }}</div>
        <div class="event-meta">
          <span>用户: {{ e.user_id.slice(0, 12) || '-' }}</span>
          <span>IP: {{ e.ip || '-' }}</span>
        </div>
        <button *ngIf="!e.resolved" class="btn-resolve" (click)="resolve(e.id)">标记已处理</button>
      </div>
      <div *ngIf="!loading && events().length === 0" class="empty">暂无事件</div>
    </div>
  `,
  styles: [`
    .risk-page { padding: 24px; max-width: 800px; }
    .filter-bar { display: flex; gap: 8px; margin: 16px 0; }
    .filter-btn { padding: 6px 16px; border: 1px solid #d9d9d9; border-radius: 6px; background: #fff; cursor: pointer; font-size: 13px; }
    .filter-btn.active { background: #1677ff; color: #fff; border-color: #1677ff; }
    .loading, .empty { text-align: center; padding: 40px; color: #999; }
    .event-card { background: #fff; border: 1px solid #ffccc7; border-radius: 8px; padding: 14px; margin-bottom: 10px; }
    .event-card.resolved { border-color: #d9d9d9; opacity: 0.7; }
    .event-header { display: flex; gap: 10px; align-items: center; margin-bottom: 6px; font-size: 13px; }
    .event-type { font-weight: 600; color: #cf1322; text-transform: uppercase; font-size: 12px; }
    .event-status { padding: 1px 6px; border-radius: 3px; font-size: 11px; background: #fff7e6; color: #d46b08; }
    .event-status.resolved { background: #f6ffed; color: #389e0d; }
    .event-time { color: #999; margin-left: auto; font-size: 12px; }
    .event-desc { font-size: 14px; color: #333; margin-bottom: 6px; }
    .event-meta { display: flex; gap: 16px; font-size: 12px; color: #999; margin-bottom: 8px; }
    .btn-resolve { padding: 4px 12px; border: none; border-radius: 4px; background: #52c41a; color: #fff; cursor: pointer; font-size: 12px; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminRiskEventsComponent implements OnInit {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  readonly events = signal<RiskEventItem[]>([]);
  readonly loading = signal(false);
  readonly showResolved = signal(false);

  ngOnInit(): void { this.loadEvents(); }

  loadEvents(): void {
    this.loading.set(true);
    this.http.get<{ events: RiskEventItem[] }>(this.apiUrl + '/admin/risk-events').subscribe({
      next: (res) => {
        const all = res.events || [];
        this.events.set(this.showResolved() ? all.filter((e) => e.resolved) : all.filter((e) => !e.resolved));
        this.loading.set(false);
      },
      error: () => {
        const all = MOCK_EVENTS;
        this.events.set(this.showResolved() ? all.filter((e) => e.resolved) : all.filter((e) => !e.resolved));
        this.loading.set(false);
      },
    });
  }

  resolve(id: string): void {
    this.http.post(this.apiUrl + '/admin/risk-events/' + id + '/resolve', {}).subscribe({
      next: () => this.loadEvents(),
      error: () => alert('操作失败'),
    });
  }
}
