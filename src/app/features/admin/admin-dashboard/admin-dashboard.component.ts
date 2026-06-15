import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzStatisticModule } from 'ng-zorro-antd/statistic';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { PostService } from '../../../core/services/post.service';
import { UserService, UserStats } from '../../../core/services/user.service';

interface PostStats {
  totalPosts: number;
  publishedPosts: number;
  draftPosts: number;
  totalViews: number;
}

@Component({
  selector: 'app-admin-dashboard',
  imports: [RouterLink, NzCardModule, NzStatisticModule, NzButtonModule, NzIconModule, NzGridModule],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDashboardComponent implements OnInit {
  private postService = inject(PostService);
  private userService = inject(UserService);
  private router = inject(Router);

  readonly postStats = signal<PostStats>({
    totalPosts: 0,
    publishedPosts: 0,
    draftPosts: 0,
    totalViews: 0,
  });
  readonly userStats = signal<UserStats>({
    total_users: 0,
    active_users: 0,
    banned_users: 0,
    recent_users: 0,
  });
  readonly loading = signal(false);

  ngOnInit(): void {
    this.loadPostStats();
    this.loadUserStats();
  }

  private loadPostStats(): void {
    this.loading.set(true);
    this.postService.getPosts(1, 1000).subscribe({
      next: (response) => {
        const posts = response.posts || [];
        this.postStats.set({
          totalPosts: posts.length,
          publishedPosts: posts.filter((p) => p.status === 'published').length,
          draftPosts: posts.filter((p) => p.status === 'draft').length,
          totalViews: posts.reduce((sum, p) => sum + (p.view_count || 0), 0),
        });
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private loadUserStats(): void {
    this.userService.getStats().subscribe({
      next: (stats) => this.userStats.set(stats),
      error: (err) => console.error('Failed to load user stats:', err),
    });
  }

  go(path: string): void {
    this.router.navigate([path]);
  }
}
