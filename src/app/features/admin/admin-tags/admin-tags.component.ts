import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzFormModule } from 'ng-zorro-antd/form';
import {
  ContentService,
  Tag,
} from '../../../core/services/content.service';

@Component({
  selector: 'app-admin-tags',
  imports: [
    CommonModule,
    FormsModule,
    NzTableModule,
    NzButtonModule,
    NzIconModule,
    NzTagModule,
    NzTooltipModule,
    NzInputModule,
    NzModalModule,
    NzFormModule,
  ],
  templateUrl: './admin-tags.html',
  styleUrl: './admin-tags.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminTagsComponent implements OnInit {
  private contentService = inject(ContentService);
  private message = inject(NzMessageService);
  private modal = inject(NzModalService);

  readonly tags = signal<Tag[]>([]);
  readonly loading = signal(false);
  readonly modalVisible = signal(false);
  readonly editingId = signal<string | null>(null);

  // 表单
  readonly formSlug = signal('');
  readonly formName = signal('');
  readonly formColor = signal('#1890ff');

  ngOnInit(): void {
    this.loadTags();
  }

  loadTags(): void {
    this.loading.set(true);
    this.contentService.listTags().subscribe({
      next: (list) => {
        this.tags.set(list || []);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load tags:', err);
        this.message.error('加载标签失败');
        this.loading.set(false);
      },
    });
  }

  openCreateModal(): void {
    this.editingId.set(null);
    this.resetForm();
    this.modalVisible.set(true);
  }

  openEditModal(tag: Tag): void {
    this.editingId.set(tag.id);
    this.formSlug.set(tag.slug);
    this.formName.set(tag.name);
    this.formColor.set(tag.color || '#1890ff');
    this.modalVisible.set(true);
  }

  closeModal(): void {
    this.modalVisible.set(false);
    this.resetForm();
  }

  private resetForm(): void {
    this.formSlug.set('');
    this.formName.set('');
    this.formColor.set('#1890ff');
  }

  onSubmit(): void {
    if (!this.formSlug() || !this.formName()) {
      this.message.warning('Slug 和名称不能为空');
      return;
    }

    const id = this.editingId();
    if (id) {
      this.contentService.updateTag(id, {
        slug: this.formSlug(),
        name: this.formName(),
        color: this.formColor(),
      }).subscribe({
        next: () => {
          this.message.success('标签已更新');
          this.closeModal();
          this.loadTags();
        },
        error: () => this.message.error('更新标签失败'),
      });
    } else {
      this.contentService.createTag({
        slug: this.formSlug(),
        name: this.formName(),
        color: this.formColor(),
      }).subscribe({
        next: () => {
          this.message.success('标签已创建');
          this.closeModal();
          this.loadTags();
        },
        error: () => this.message.error('创建标签失败'),
      });
    }
  }

  onDelete(tag: Tag): void {
    this.modal.confirm({
      nzTitle: '删除标签',
      nzContent: `确定要删除标签「${tag.name}」吗？`,
      nzOkText: '删除',
      nzOkType: 'primary',
      nzOkDanger: true,
      nzCancelText: '取消',
      nzOnOk: () =>
        new Promise<boolean>((resolve) => {
          this.contentService.deleteTag(tag.id).subscribe({
            next: () => {
              this.message.success('已删除');
              this.tags.update((list) => list.filter((t) => t.id !== tag.id));
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
}
