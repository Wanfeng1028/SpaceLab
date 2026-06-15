import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { FormsModule } from '@angular/forms';
import {
  UserService,
  AdminUser,
  UserRole,
} from '../../../core/services/user.service';

@Component({
  selector: 'app-admin-users',
  imports: [
    CommonModule,
    FormsModule,
    NzTableModule,
    NzButtonModule,
    NzIconModule,
    NzTagModule,
    NzTooltipModule,
    NzSelectModule,
  ],
  templateUrl: './admin-users.html',
  styleUrl: './admin-users.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminUsersComponent implements OnInit {
  private userService = inject(UserService);
  private message = inject(NzMessageService);
  private modal = inject(NzModalService);

  readonly users = signal<AdminUser[]>([]);
  readonly loading = signal(false);

  // 角色可选项
  readonly roleOptions: { label: string; value: UserRole }[] = [
    { label: '管理员', value: 'admin' },
    { label: '作者', value: 'writer' },
    { label: '访客', value: 'viewer' },
  ];

  // 记录每个用户当前是否为封禁态（后端用 deleted_at 标记，列表不返回该字段，
  // 这里仅用于本地切换按钮文案，状态以后端实际返回为准）
  readonly bannedIds = signal<Set<string>>(new Set());

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading.set(true);
    this.userService.listUsers(1, 1000).subscribe({
      next: (response) => {
        this.users.set(response.users || []);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load users:', err);
        this.message.error('加载用户列表失败');
        this.loading.set(false);
      },
    });
  }

  /** 修改用户角色 */
  onRoleChange(user: AdminUser, role: UserRole): void {
    this.userService.updateRole(user.id, role).subscribe({
      next: () => {
        this.message.success('角色已更新');
        // 本地同步更新，避免整表刷新
        this.users.update((list) =>
          list.map((u) => (u.id === user.id ? { ...u, role } : u)),
        );
      },
      error: () => this.message.error('更新角色失败'),
    });
  }

  /** 封禁 / 解封 */
  onToggleStatus(user: AdminUser): void {
    const isBanned = this.bannedIds().has(user.id);
    const nextStatus = isBanned ? 'active' : 'banned';
    const action = isBanned ? '解封' : '封禁';

    this.modal.confirm({
      nzTitle: `${action}用户`,
      nzContent: `确定要${action}用户「${user.username || user.email}」吗？`,
      nzOkText: action,
      nzOkType: 'primary',
      nzOkDanger: !isBanned,
      nzCancelText: '取消',
      nzOnOk: () =>
        new Promise<boolean>((resolve) => {
          this.userService.updateStatus(user.id, nextStatus).subscribe({
            next: () => {
              this.message.success(`${action}成功`);
              this.bannedIds.update((set) => {
                const next = new Set(set);
                if (isBanned) {
                  next.delete(user.id);
                } else {
                  next.add(user.id);
                }
                return next;
              });
              resolve(true);
            },
            error: () => {
              this.message.error(`${action}失败`);
              resolve(true);
            },
          });
        }),
    });
  }

  /** 重置密码 */
  onResetPassword(user: AdminUser): void {
    let newPassword = '';
    this.modal.create({
      nzTitle: '重置密码',
      nzContent: `
        <p>为用户「${user.username || user.email}」设置新密码（至少 8 位）</p>
        <input type="password" id="reset-pwd-input" class="ant-input" placeholder="新密码" minlength="8" />
      `,
      nzOkText: '确认重置',
      nzOkType: 'primary',
      nzOkDanger: true,
      nzCancelText: '取消',
      nzOnOk: () =>
        new Promise<boolean>((resolve) => {
          const input = document.getElementById(
            'reset-pwd-input',
          ) as HTMLInputElement | null;
          newPassword = input?.value ?? '';
          if (!newPassword || newPassword.length < 8) {
            this.message.warning('密码至少 8 位');
            resolve(false);
            return;
          }
          this.userService.resetPassword(user.id, newPassword).subscribe({
            next: () => {
              this.message.success('密码已重置');
              resolve(true);
            },
            error: () => {
              this.message.error('重置失败');
              resolve(true);
            },
          });
        }),
    });
  }

  /** 删除用户 */
  onDelete(user: AdminUser): void {
    this.modal.confirm({
      nzTitle: '删除用户',
      nzContent: `确定要删除用户「${user.username || user.email}」吗？此操作不可恢复。`,
      nzOkText: '删除',
      nzOkType: 'primary',
      nzOkDanger: true,
      nzCancelText: '取消',
      nzOnOk: () =>
        new Promise<boolean>((resolve) => {
          this.userService.deleteUser(user.id).subscribe({
            next: () => {
              this.message.success('已删除');
              this.users.update((list) => list.filter((u) => u.id !== user.id));
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

  /** 是否为当前登录用户自己（避免误操作自己） */
  isSelf(user: AdminUser): boolean {
    return false; // 占位：admin-shell 已注入 currentUser，可在需要时扩展
  }

  roleText(role: string): string {
    return role === 'admin' ? '管理员' : role === 'writer' ? '作者' : '访客';
  }

  roleColor(role: string): string {
    return role === 'admin' ? 'red' : role === 'writer' ? 'blue' : 'default';
  }
}
