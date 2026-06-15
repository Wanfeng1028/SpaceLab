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
  Category,
  CreateCategoryInput,
} from '../../../core/services/content.service';

@Component({
  selector: 'app-admin-categories',
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
  templateUrl: './admin-categories.html',
  styleUrl: './admin-categories.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminCategoriesComponent implements OnInit {
  private contentService = inject(ContentService);
  private message = inject(NzMessageService);
  private modal = inject(NzModalService);

  readonly categories = signal<Category[]>([]);
  readonly loading = signal(false);
  readonly modalVisible = signal(false);
  readonly editingId = signal<string | null>(null);

  // 表单
  readonly formSlug = signal('');
  readonly formName = signal('');
  readonly formDescription = signal('');
  readonly formIcon = signal('');
  readonly formSortOrder = signal(0);
  readonly formParentId = signal<string | null>(null);

  ngOnInit(): void {
    this.loadCategories();
  }

  loadCategories(): void {
    this.loading.set(true);
    this.contentService.listCategories().subscribe({
      next: (list) => {
        this.categories.set(list || []);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load categories:', err);
        this.message.error('加载分类失败');
        this.loading.set(false);
      },
    });
  }

  openCreateModal(): void {
    this.editingId.set(null);
    this.resetForm();
    this.modalVisible.set(true);
  }

  openEditModal(category: Category): void {
    this.editingId.set(category.id);
    this.formSlug.set(category.slug);
    this.formName.set(category.name);
    this.formDescription.set(category.description || '');
    this.formIcon.set(category.icon || '');
    this.formSortOrder.set(category.sort_order || 0);
    this.formParentId.set(category.parent_id || null);
    this.modalVisible.set(true);
  }

  closeModal(): void {
    this.modalVisible.set(false);
    this.resetForm();
  }

  private resetForm(): void {
    this.formSlug.set('');
    this.formName.set('');
    this.formDescription.set('');
    this.formIcon.set('');
    this.formSortOrder.set(0);
    this.formParentId.set(null);
  }

  onSubmit(): void {
    if (!this.formSlug() || !this.formName()) {
      this.message.warning('Slug 和名称不能为空');
      return;
    }

    const id = this.editingId();
    if (id) {
      // 更新
      this.contentService.updateCategory(id, {
        slug: this.formSlug(),
        name: this.formName(),
        description: this.formDescription(),
        icon: this.formIcon(),
        sort_order: this.formSortOrder(),
        parent_id: this.formParentId() || undefined,
      }).subscribe({
        next: () => {
          this.message.success('分类已更新');
          this.closeModal();
          this.loadCategories();
        },
        error: () => this.message.error('更新分类失败'),
      });
    } else {
      // 创建
      this.contentService.createCategory({
        slug: this.formSlug(),
        name: this.formName(),
        description: this.formDescription(),
        icon: this.formIcon(),
        sort_order: this.formSortOrder(),
        parent_id: this.formParentId() || undefined,
      }).subscribe({
        next: () => {
          this.message.success('分类已创建');
          this.closeModal();
          this.loadCategories();
        },
        error: () => this.message.error('创建分类失败'),
      });
    }
  }

  onDelete(category: Category): void {
    this.modal.confirm({
      nzTitle: '删除分类',
      nzContent: `确定要删除分类「${category.name}」吗？`,
      nzOkText: '删除',
      nzOkType: 'primary',
      nzOkDanger: true,
      nzCancelText: '取消',
      nzOnOk: () =>
        new Promise<boolean>((resolve) => {
          this.contentService.deleteCategory(category.id).subscribe({
            next: () => {
              this.message.success('已删除');
              this.categories.update((list) => list.filter((c) => c.id !== category.id));
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

  /** 找出可作为父级的分类（排除自身和子级） */
  parentOptions(): Category[] {
    const editId = this.editingId();
    return this.categories().filter((c) => c.id !== editId);
  }
}
