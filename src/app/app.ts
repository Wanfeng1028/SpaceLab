import { Component, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { NavbarComponent } from './shared/components/navbar/navbar.component';
import { ToastComponent } from './shared/components/toast/toast.component';
import { FooterComponent } from './shared/components/footer/footer.component';
import { AuthService } from './core/services/auth.service';
import { LenisScrollService } from './core/services/lenis-scroll.service';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NavbarComponent, ToastComponent, FooterComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly authService = inject(AuthService);
  private readonly lenisScroll = inject(LenisScrollService);

  readonly isHome = signal(true);
  readonly isAdmin = signal(false);

  ngOnInit() {
    // 启动时验证 token 有效性，过期则清理
    if (this.authService.isLoggedInSig()) {
      this.authService.getMe().subscribe({
        error: () => {
          // 401 interceptor 已处理清理和跳转
        },
      });
    }

    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((e) => {
        const url = e.urlAfterRedirects;
        this.isHome.set(url === '/' || url.startsWith('/home'));
        this.isAdmin.set(url.startsWith('/admin'));

        // 路由切换统一恢复滚动：确保 Lenis 恢复 + 回到顶部
        requestAnimationFrame(() => {
          this.lenisScroll.start();
          this.lenisScroll.resize();
          this.lenisScroll.scrollTo(0, { immediate: true });
          window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        });
      });
  }
}
