import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../../environments/environment';

interface ReportItem {
  id: string;
  comment_id: string;
  reporter_id: string;
  reason: string;
  description: string;
  status: string;
  created_at: string;
  comment?: { content: string; user?: { username: string } };
  reporter?: { username: string };
}

@Component({
  selector: 'app-admin-comment-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="reports-page">
      <h2>评论举报管理</h2>
      <div class="status-tabs">
        <button *ngFor="let s of statusOptions" class="tab-btn" [class.active]="statusFilter() === s.value" (click)="setFilter(s.value)">
          {{ s.label }}
        </button>
      </div>
      <div *ngIf="loading" class="loading">加载中...</div>
      <div *ngFor="let r of reports()" class="report-card">
        <div class="report-header">
          <span class="report-reason" [class]="'reason--' + r.reason">{{ reasonLabel(r.reason) }}</span>
          <span class="report-status" [class]="'status--' + r.status">{{ statusLabel(r.status) }}</span>
          <span class="report-date">{{ r.created_at.slice(0, 10) }}</span>
        </div>
        <div class="report-comment">{{ r.comment?.content || '评论已删除' }}</div>
        <div *ngIf="r.description" class="report-desc">{{ r.description }}</div>
        <div class="report-footer">
          <span class="report-reporter">举报者：{{ r.reporter?.username || r.reporter_id.slice(0, 8) }}</span>
          <div *ngIf="r.status === 'pending'" class="report-actions">
            <button class="btn btn-approve" (click)="review(r.id, 'reviewed')">标记已处理</button>
            <button class="btn btn-dismiss" (click)="review(r.id, 'dismissed')">驳回</button>
          </div>
        </div>
      </div>
      <div *ngIf="!loading && reports().length === 0" class="empty">暂无举报</div>
    </div>
  `,
  styles: [`
    .reports-page { padding: 24px; max-width: 800px; }
    .status-tabs { display: flex; gap: 8px; margin: 16px 0; }
    .tab-btn { padding: 6px 16px; border: 1px solid #d9d9d9; border-radius: 6px; background: #fff; cursor: pointer; font-size: 13px; }
    .tab-btn.active { background: #1677ff; color: #fff; border-color: #1677ff; }
    .loading, .empty { text-align: center; padding: 40px; color: #999; }
    .report-card { background: #fff; border: 1px solid #f0f0f0; border-radius: 8px; padding: 16px; margin-bottom: 12px; }
    .report-header { display: flex; gap: 12px; align-items: center; margin-bottom: 8px; font-size: 13px; }
    .report-reason { padding: 2px 8px; border-radius: 4px; font-weight: 500; font-size: 12px; }
    .reason--spam { background: #fff7e6; color: #d46b08; }
    .reason--harassment { background: #fff1f0; color: #cf1322; }
    .reason--inappropriate { background: #f6ffed; color: #389e0d; }
    .reason--other { background: #f0f5ff; color: #0958d9; }
    .report-status { padding: 1px 6px; border-radius: 3px; font-size: 11px; }
    .status--pending { background: #fff7e6; color: #d46b08; border: 1px solid #ffd591; }
    .status--reviewed { background: #f6ffed; color: #389e0d; border: 1px solid #b7eb8f; }
    .status--dismissed { background: #f5f5f5; color: #999; border: 1px solid #d9d9d9; }
    .report-date { color: #999; margin-left: auto; }
    .report-comment { font-size: 14px; color: #333; padding: 8px 0; border-bottom: 1px solid #f5f5f5; margin-bottom: 8px; }
    .report-desc { font-size: 13px; color: #666; margin-bottom: 8px; }
    .report-footer { display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: #999; }
    .report-actions { display: flex; gap: 8px; }
    .btn { padding: 4px 12px; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; }
    .btn-approve { background: #52c41a; color: #fff; }
    .btn-dismiss { background: #d9d9d9; color: #666; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminCommentReportsComponent implements OnInit {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  readonly reports = signal<ReportItem[]>([]);
  readonly loading = signal(false);
  readonly statusFilter = signal('pending');

  readonly statusOptions = [
    { label: '待处理', value: 'pending' },
    { label: '已处理', value: 'reviewed' },
    { label: '已驳回', value: 'dismissed' },
    { label: '全部', value: '' },
  ];

  ngOnInit(): void { this.loadReports(); }

  setFilter(status: string): void {
    this.statusFilter.set(status);
    this.loadReports();
  }

  loadReports(): void {
    this.loading.set(true);
    const status = this.statusFilter();
    const params = status ? '?status=' + status : '';
    this.http.get<{ reports: ReportItem[] }>(this.apiUrl + '/admin/comment-reports' + params).subscribe({
      next: (res) => { this.reports.set(res.reports || []); this.loading.set(false); },
      error: () => { this.reports.set([]); this.loading.set(false); },
    });
  }

  review(id: string, status: string): void {
    this.http.post(this.apiUrl + '/admin/comment-reports/' + id + '/review', { status }).subscribe({
      next: () => this.loadReports(),
      error: () => alert('操作失败'),
    });
  }

  reasonLabel(r: string): string {
    const map: Record<string, string> = { spam: 'spam', harassment: 'harassment', inappropriate: 'inappropriate', other: 'other' };
    return map[r] || r;
  }

  statusLabel(s: string): string {
    const map: Record<string, string> = { pending: 'pending', reviewed: 'reviewed', dismissed: 'dismissed' };
    return map[s] || s;
  }
}
