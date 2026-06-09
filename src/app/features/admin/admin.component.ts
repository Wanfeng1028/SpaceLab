import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { I18nService } from '../../core/services/i18n.service';
import { AuthService } from '../../core/services/auth.service';
import { PostService } from '../../core/services/post.service';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.html',
  styleUrl: './admin.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, CommonModule],
})
export class AdminComponent implements OnInit {
  private i18n = inject(I18nService);
  private authService = inject(AuthService);
  private postService = inject(PostService);
  private router = inject(Router);

  readonly currentUser = signal<any>(null);
  readonly posts = signal<any[]>([]);
  readonly loading = signal(false);
  readonly stats = signal({
    totalPosts: 0,
    publishedPosts: 0,
    draftPosts: 0,
    totalViews: 0
  });

  ngOnInit(): void {
    this.currentUser.set(this.authService.getCurrentUser());
    this.loadPosts();
    this.loadStats();
  }

  t(key: string): string {
    return this.i18n.t(key);
  }

  loadPosts(): void {
    this.loading.set(true);
    this.postService.getPosts().subscribe({
      next: (response) => {
        this.posts.set(response.posts || []);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load posts:', err);
        this.loading.set(false);
      }
    });
  }

  loadStats(): void {
    // 获取统计数据
    this.postService.getPosts().subscribe({
      next: (response) => {
        const posts = response.posts || [];
        this.stats.set({
          totalPosts: posts.length,
          publishedPosts: posts.filter(p => p.status === 'published').length,
          draftPosts: posts.filter(p => p.status === 'draft').length,
          totalViews: posts.reduce((sum, p) => sum + (p.view_count || 0), 0)
        });
      }
    });
  }

  onNewArticle(): void {
    this.router.navigate(['/admin/write']);
  }

  onEditArticle(id: string): void {
    this.router.navigate(['/admin/write', id]);
  }

  onDeleteArticle(id: string): void {
    if (confirm('确定要删除这篇文章吗？')) {
      this.postService.deletePost(id).subscribe({
        next: () => {
          this.loadPosts();
          this.loadStats();
        },
        error: (err) => {
          console.error('Failed to delete post:', err);
        }
      });
    }
  }

  onPublishArticle(id: string): void {
    this.postService.publishPost(id).subscribe({
      next: () => {
        this.loadPosts();
        this.loadStats();
      },
      error: (err) => {
        console.error('Failed to publish post:', err);
      }
    });
  }

  onLogout(): void {
    this.authService.logout();
  }
}
