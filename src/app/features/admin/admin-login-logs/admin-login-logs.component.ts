import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

interface LoginLogItem {
  id: string;
  user_id: string;
  email: string;
  ip: string;
  user_agent: string;
  device: string;
  success: boolean;
  fail_reason: string;
  login_at: string;
}

/* ── Mock Data ──────────────────────────────────────────────────────── */

const MOCK_LOGS: LoginLogItem[] = [
  { id: 'l1', user_id: 'u1', email: 'admin@spacelab.com', ip: '192.168.1.100', user_agent: 'Mozilla/5.0 Chrome/126', device: 'Chrome / Windows', success: true, fail_reason: '', login_at: '2026-07-11T08:30:00Z' },
  { id: 'l2', user_id: 'u2', email: 'writer@spacelab.com', ip: '10.0.0.55', user_agent: 'Mozilla/5.0 Firefox/128', device: 'Firefox / macOS', success: true, fail_reason: '', login_at: '2026-07-11T09:15:00Z' },
  { id: 'l3', user_id: 'unknown', email: '', ip: '203.0.113.42', user_agent: 'Mozilla/5.0 Chrome/126', device: 'Chrome / Linux', success: false, fail_reason: 'invalid credentials', login_at: '2026-07-11T02:40:00Z' },
  { id: 'l4', user_id: 'u3', email: 'viewer@spacelab.com', ip: '172.16.0.88', user_agent: 'Mozilla/5.0 Safari/17', device: 'Safari / macOS', success: true, fail_reason: '', login_at: '2026-07-10T18:20:00Z' },
  { id: 'l5', user_id: 'u4', email: 'editor@spacelab.com', ip: '192.168.2.201', user_agent: 'Mozilla/5.0 Edge/126', device: 'Edge / Windows', success: true, fail_reason: '', login_at: '2026-07-10T14:05:00Z' },
  { id: 'l6', user_id: 'unknown', email: '', ip: '198.51.100.77', user_agent: 'python-requests/2.31', device: 'python-requests', success: false, fail_reason: 'account not found', login_at: '2026-07-10T03:12:00Z' },
];

@Component({
  selector: 'app-admin-login-logs',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="logs-page">
      <h2>登录日志</h2>
      <div *ngIf="loading" class="loading">加载中...</div>
      <table *ngIf="!loading && logs().length > 0" class="log-table">
        <thead>
          <tr><th>用户</th><th>IP</th><th>设备</th><th>状态</th><th>时间</th></tr>
        </thead>
        <tbody>
          <tr *ngFor="let l of logs()">
            <td>{{ l.email || l.user_id.slice(0, 8) }}</td>
            <td><code>{{ l.ip }}</code></td>
            <td class="device">{{ l.device || '-' }}</td>
            <td><span class="status" [class.ok]="l.success" [class.fail]="!l.success">{{ l.success ? '成功' : '失败' }}</span></td>
            <td class="time">{{ l.login_at }}</td>
          </tr>
        </tbody>
      </table>
      <div *ngIf="!loading && logs().length === 0" class="empty">暂无日志</div>
    </div>
  `,
  styles: [`
    .logs-page { padding: 24px; max-width: 1000px; }
    .loading, .empty { text-align: center; padding: 40px; color: #999; }
    .log-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .log-table th, .log-table td { text-align: left; padding: 8px 12px; border-bottom: 1px solid #f0f0f0; }
    .log-table th { font-weight: 600; color: #666; }
    .log-table code { background: #f5f5f5; padding: 1px 6px; border-radius: 3px; font-size: 12px; }
    .device { color: #666; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .time { color: #999; font-size: 12px; white-space: nowrap; }
    .status { padding: 1px 6px; border-radius: 3px; font-size: 11px; }
    .status.ok { background: #f6ffed; color: #389e0d; }
    .status.fail { background: #fff1f0; color: #cf1322; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminLoginLogsComponent implements OnInit {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  readonly logs = signal<LoginLogItem[]>([]);
  readonly loading = signal(false);

  ngOnInit(): void {
    this.loading.set(true);
    this.http.get<{ logs: LoginLogItem[] }>(this.apiUrl + '/admin/login-logs?page_size=100').subscribe({
      next: (res) => { this.logs.set(res.logs || []); this.loading.set(false); },
      error: () => { this.logs.set(MOCK_LOGS); this.loading.set(false); },
    });
  }
}
