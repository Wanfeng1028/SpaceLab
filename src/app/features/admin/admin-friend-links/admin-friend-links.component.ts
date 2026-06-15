import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzSelectModule } from 'ng-zorro-antd/select';
import {
  ContentService,
  FriendLink,
} from '../../../core/services/content.service';

@Component({
  selector: 'app-admin-friend-links',
  imports: [
    CommonModule,
    FormsModule,
    NzTableModule,
    NzButtonModule,
    NzIconModule,
    NzTagModule,
    NzTooltipModule,
    NzInputModule,
    NzInputNumberModule,
    NzModalModule,
    NzFormModule,
    NzSelectModule,
  ],
  templateUrl: './admin-friend-links.html',
  styleUrl: './admin-friend-links.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminFriendLinksComponent implements OnInit {
  private contentService = inject(ContentService);
  private message = inject(NzMessageService);
  private modal = inject(NzModalService);

  readonly friendLinks = signal<FriendLink[]>([]);
  readonly loading = signal(false);
  readonly modalVisible = signal(false);
  readonly editingId = signal<string | null>(null);

  // 表单
  readonly formName = signal('');
  readonly formUrl = signal('');
  readonly formLogoUrl = signal('');
  readonly formDescription = signal('');
  readonly formSortOrder = signal(0);
  readonly formStatus = signal<'active' | 'inactive'>('active');

  ngOnInit(): void {
    this.loadFriendLinks();
  }

  loadFriendLinks(): void {
    this.loading.set(true);
    this.contentService.listFriendLinks().subscribe({
      next: (list) => {
        this.friendLinks.set(list || []);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load friend links:', err);
        this.message.error('加载友链失败');
        this.loading.set(false);
      },
    });
  }

  openCreateModal(): void {
    this.editingId.set(null);
    this.resetForm();
    this.modalVisible.set(true);
  }

  openEditModal(link: FriendLink): void {
    this.editingId.set(link.id);
    this.formName.set(link.name);
    this.formUrl.set(link.url);
    this.formLogoUrl.set(link.logo_url || '');
    this.formDescription.set(link.description || '');
    this.formSortOrder.set(link.sort_order || 0);
    this.formStatus.set(link.status || 'active');
    this.modalVisible.set(true);
  }

  closeModal(): void {
    this.modalVisible.set(false);
    this.resetForm();
  }

  private resetForm(): void {
    this.formName.set('');
    this.formUrl.set('');
    this.formLogoUrl.set('');
    this.formDescription.set('');
    this.formSortOrder.set(0);
    this.formStatus.set('active');
  }

  onSubmit(): void {
    if (!this.formName() || !this.formUrl()) {
      this.message.warning('名称和 URL 不能为空');
      return;
    }

    const id = this.editingId();
    if (id) {
      this.contentService.updateFriendLink(id, {
        name: this.formName(),
        url: this.formUrl(),
        logo_url: this.formLogoUrl(),
        description: this.formDescription(),
        sort_order: this.formSortOrder(),
        status: this.formStatus(),
      }).subscribe({
        next: () => {
          this.message.success('友链已更新');
          this.closeModal();
          this.loadFriendLinks();
        },
        error: () => this.message.error('更新友链失败'),
      });
    } else {
      this.contentService.createFriendLink({
        name: this.formName(),
        url: this.formUrl(),
        logo_url: this.formLogoUrl(),
        description: this.formDescription(),
        sort_order: this.formSortOrder(),
        status: this.formStatus(),
      }).subscribe({
        next: () => {
          this.message.success('友链已创建');
          this.closeModal();
          this.loadFriendLinks();
        },
        error: () => this.message.error('创建友链失败'),
      });
    }
  }

  onDelete(link: FriendLink): void {
    this.modal.confirm({
      nzTitle: '删除友链',
      nzContent: `确定要删除友链「${link.name}」吗？`,
      nzOkText: '删除',
      nzOkType: 'primary',
      nzOkDanger: true,
      nzCancelText: '取消',
      nzOnOk: () =>
        new Promise<boolean>((resolve) => {
          this.contentService.deleteFriendLink(link.id).subscribe({
            next: () => {
              this.message.success('已删除');
              this.friendLinks.update((list) => list.filter((f) => f.id !== link.id));
              resolve(true);
            },
            error: () => {
              this.message.error('删除失败');
              resolve(true);
            },
          });
        }),
    });
  }

  statusText(status: string): string {
    return status === 'active' ? '活跃' : '已停用';
  }
}
