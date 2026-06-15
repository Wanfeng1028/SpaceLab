import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { AuthService, type User } from '../../core/services/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    NzCardModule,
    NzTagModule,
    NzButtonModule,
    NzInputModule,
    NzFormModule,
    NzDividerModule,
  ],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private message = inject(NzMessageService);
  private modal = inject(NzModalService);

  // 用户信息
  readonly currentUser = signal<User | null>(null);
  readonly loading = signal(false);

  // 编辑资料表单
  readonly editUsername = signal('');
  readonly editAvatarUrl = signal('');
  readonly savingProfile = signal(false);

  // 修改密码表单
  readonly oldPassword = signal('');
  readonly newPassword = signal('');
  readonly confirmPassword = signal('');
  readonly changingPassword = signal(false);

  ngOnInit(): void {
    this.loadUser();
  }

  private loadUser(): void {
    this.loading.set(true);
    this.authService.getMe().subscribe({
      next: (user) => {
        this.currentUser.set(user);
        this.editUsername.set(user.username || '');
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.message.error('加载用户信息失败');
      },
    });
  }

  /** 保存个人资料 */
  onSaveProfile(): void {
    const username = this.editUsername().trim();
    if (!username) {
      this.message.warning('用户名不能为空');
      return;
    }

    this.savingProfile.set(true);
    this.authService.updateProfile(username, this.editAvatarUrl()).subscribe({
      next: () => {
        this.savingProfile.set(false);
        this.message.success('资料已更新');
        // 刷新用户信息
        this.loadUser();
      },
      error: () => {
        this.savingProfile.set(false);
        this.message.error('更新失败，请稍后重试');
      },
    });
  }

  /** 修改密码 */
  onChangePassword(): void {
    const oldPwd = this.oldPassword();
    const newPwd = this.newPassword();
    const confirmPwd = this.confirmPassword();

    if (!oldPwd || !newPwd || !confirmPwd) {
      this.message.warning('请填写所有密码字段');
      return;
    }

    if (newPwd.length < 6) {
      this.message.warning('新密码长度至少为 6 位');
      return;
    }

    if (newPwd !== confirmPwd) {
      this.message.warning('两次输入的新密码不一致');
      return;
    }

    this.changingPassword.set(true);
    this.authService.updatePassword(oldPwd, newPwd).subscribe({
      next: () => {
        this.changingPassword.set(false);
        this.message.success('密码已修改');
        this.oldPassword.set('');
        this.newPassword.set('');
        this.confirmPassword.set('');
      },
      error: (err) => {
        this.changingPassword.set(false);
        this.message.error(err.error?.error || '修改密码失败');
      },
    });
  }

  /** 退出登录 */
  onLogout(): void {
    this.modal.confirm({
      nzTitle: '退出登录',
      nzContent: '确定要退出登录吗？',
      nzOkText: '退出',
      nzCancelText: '取消',
      nzOnOk: () => {
        this.authService.logout();
      },
    });
  }

  /** 角色中文名 */
  roleText(role: string): string {
    switch (role) {
      case 'admin': return '管理员';
      case 'writer': return '作者';
      case 'viewer': return '访客';
      default: return role;
    }
  }

  /** 角色标签颜色 */
  roleColor(role: string): string {
    switch (role) {
      case 'admin': return 'red';
      case 'writer': return 'blue';
      default: return 'default';
    }
  }

  /** 格式化日期 */
  formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
}
