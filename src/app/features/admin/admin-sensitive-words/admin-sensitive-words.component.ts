import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../../environments/environment';

interface SensitiveWordItem {
  id: string;
  word: string;
  category: string;
  created_at: string;
}

/* ── Mock Data ──────────────────────────────────────────────────────── */

const MOCK_WORDS: SensitiveWordItem[] = [
  { id: 'sw1', word: '示例敏感词A', category: 'profanity', created_at: '2026-06-01T08:00:00Z' },
  { id: 'sw2', word: '示例敏感词B', category: 'spam', created_at: '2026-06-05T10:30:00Z' },
  { id: 'sw3', word: '示例敏感词C', category: 'ads', created_at: '2026-06-10T14:00:00Z' },
  { id: 'sw4', word: '示例敏感词D', category: 'politics', created_at: '2026-06-15T09:15:00Z' },
  { id: 'sw5', word: '示例敏感词E', category: 'profanity', created_at: '2026-06-20T11:45:00Z' },
];

@Component({
  selector: 'app-admin-sensitive-words',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="sw-page">
      <h2>敏感词管理</h2>
      <div class="sw-add">
        <input [ngModel]="newWord()" (ngModelChange)="newWord.set($event)" placeholder="输入敏感词" class="sw-input" />
        <select [ngModel]="newCategory()" (ngModelChange)="newCategory.set($event)" class="sw-select">
          <option value="profanity">辱骂</option>
          <option value="spam">广告</option>
          <option value="politics">政治</option>
          <option value="ads">推广</option>
        </select>
        <button class="btn btn-add" (click)="addWord()" [disabled]="!newWord().trim()">添加</button>
      </div>
      <div *ngIf="loading" class="loading">加载中...</div>
      <table *ngIf="!loading && words().length > 0" class="sw-table">
        <thead>
          <tr><th>敏感词</th><th>分类</th><th>添加时间</th><th>操作</th></tr>
        </thead>
        <tbody>
          <tr *ngFor="let w of words()">
            <td><code>{{ w.word }}</code></td>
            <td><span class="cat-tag">{{ categoryLabel(w.category) }}</span></td>
            <td class="date">{{ w.created_at.slice(0, 10) }}</td>
            <td><button class="btn-del" (click)="deleteWord(w.id)">删除</button></td>
          </tr>
        </tbody>
      </table>
      <div *ngIf="!loading && words().length === 0" class="empty">暂无敏感词</div>
    </div>
  `,
  styles: [`
    .sw-page { padding: 24px; max-width: 700px; }
    .sw-add { display: flex; gap: 8px; margin: 16px 0; }
    .sw-input { flex: 1; padding: 8px 12px; border: 1px solid #d9d9d9; border-radius: 6px; font-size: 14px; }
    .sw-select { padding: 8px; border: 1px solid #d9d9d9; border-radius: 6px; }
    .btn { padding: 8px 16px; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; }
    .btn-add { background: #1677ff; color: #fff; }
    .btn-add:disabled { background: #d9d9d9; cursor: not-allowed; }
    .btn-del { padding: 4px 10px; border: none; border-radius: 4px; background: #ff4d4f; color: #fff; cursor: pointer; font-size: 12px; }
    .loading, .empty { text-align: center; padding: 40px; color: #999; }
    .sw-table { width: 100%; border-collapse: collapse; }
    .sw-table th, .sw-table td { text-align: left; padding: 10px 12px; border-bottom: 1px solid #f0f0f0; font-size: 14px; }
    .sw-table th { font-weight: 600; color: #666; }
    .sw-table code { background: #f5f5f5; padding: 2px 8px; border-radius: 4px; font-size: 13px; }
    .date { color: #999; font-size: 13px; }
    .cat-tag { padding: 1px 6px; border-radius: 3px; font-size: 12px; background: #f0f5ff; color: #0958d9; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminSensitiveWordsComponent implements OnInit {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  readonly words = signal<SensitiveWordItem[]>([]);
  readonly loading = signal(false);
  readonly newWord = signal('');
  readonly newCategory = signal('profanity');

  ngOnInit(): void { this.loadWords(); }

  loadWords(): void {
    this.loading.set(true);
    this.http.get<{ words: SensitiveWordItem[] }>(this.apiUrl + '/admin/sensitive-words').subscribe({
      next: (res) => { this.words.set(res.words || []); this.loading.set(false); },
      error: () => { this.words.set(MOCK_WORDS); this.loading.set(false); },
    });
  }

  addWord(): void {
    const word = this.newWord().trim();
    if (!word) return;
    this.http.post(this.apiUrl + '/admin/sensitive-words', { word, category: this.newCategory() }).subscribe({
      next: () => { this.newWord.set(''); this.loadWords(); },
      error: () => alert('添加失败，可能已存在'),
    });
  }

  deleteWord(id: string): void {
    this.http.delete(this.apiUrl + '/admin/sensitive-words/' + id).subscribe({
      next: () => this.loadWords(),
      error: () => alert('删除失败'),
    });
  }

  categoryLabel(c: string): string {
    const map: Record<string, string> = { profanity: 'profanity', spam: 'spam', politics: 'politics', ads: 'ads' };
    return map[c] || c;
  }
}
