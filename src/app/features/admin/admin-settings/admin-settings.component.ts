import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-admin-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="settings-page">
      <h2>站点设置</h2>
      <div *ngIf="loading" class="loading">加载中...</div>

      <div *ngIf="!loading" class="settings-list">
        <div class="setting-item">
          <div class="setting-info">
            <strong>开放注册</strong>
            <p>允许新用户自行注册账号</p>
          </div>
          <label class="toggle">
            <input type="checkbox" [checked]="settings()['registration_open'] !== 'false'" (change)="toggle('registration_open')" />
            <span class="slider"></span>
          </label>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <strong>评论审核</strong>
            <p>所有评论需要管理员审核后才能显示</p>
          </div>
          <label class="toggle">
            <input type="checkbox" [checked]="settings()['comment_pre_moderate'] === 'true'" (change)="toggle('comment_pre_moderate')" />
            <span class="slider"></span>
          </label>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <strong>全站评论开关</strong>
            <p>关闭后所有文章评论区不再显示</p>
          </div>
          <label class="toggle">
            <input type="checkbox" [checked]="settings()['comments_enabled'] !== 'false'" (change)="toggle('comments_enabled')" />
            <span class="slider"></span>
          </label>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .settings-page { padding: 24px; max-width: 600px; }
    .loading { text-align: center; padding: 40px; color: #999; }
    .settings-list { display: flex; flex-direction: column; gap: 4px; }
    .setting-item { display: flex; justify-content: space-between; align-items: center; padding: 16px; background: #fff; border: 1px solid #f0f0f0; border-radius: 8px; margin-bottom: 8px; }
    .setting-info strong { display: block; font-size: 14px; color: #333; margin-bottom: 2px; }
    .setting-info p { margin: 0; font-size: 12px; color: #999; }
    .toggle { position: relative; display: inline-block; width: 44px; height: 24px; flex: none; }
    .toggle input { opacity: 0; width: 0; height: 0; }
    .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background: #d9d9d9; border-radius: 24px; transition: 0.2s; }
    .slider::before { content: ''; position: absolute; width: 18px; height: 18px; left: 3px; bottom: 3px; background: #fff; border-radius: 50%; transition: 0.2s; }
    .toggle input:checked + .slider { background: #1677ff; }
    .toggle input:checked + .slider::before { transform: translateX(20px); }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminSettingsComponent implements OnInit {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  readonly loading = signal(true);
  readonly settings = signal<Record<string, string>>({});

  ngOnInit(): void {
    this.http.get<{ settings: Record<string, string> }>(this.apiUrl + '/admin/settings').subscribe({
      next: (res) => { this.settings.set(res.settings || {}); this.loading.set(false); },
      error: () => { this.settings.set({}); this.loading.set(false); },
    });
  }

  toggle(key: string): void {
    const current = this.settings()[key];
    const newValue = current === 'true' ? 'false' : 'true';
    this.http.put(this.apiUrl + '/admin/settings', { key, value: newValue }).subscribe({
      next: () => {
        this.settings.update((s) => ({ ...s, [key]: newValue }));
      },
      error: () => alert('更新失败'),
    });
  }
}
