import {
  Component,
  inject,
  signal,
  OnInit,
  OnDestroy,
  HostListener,
  ChangeDetectionStrategy,
  DestroyRef,
} from '@angular/core';
import { Router, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { I18nService } from '../../../core/services/i18n.service';
import { SpaceGlassModalComponent } from '../glass/modal/space-glass-modal.component';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

const GITHUB_REPO_URL = 'https://wanfeng1028.github.io/SpaceLab/';
const GITHUB_API_URL = 'https://api.github.com/repos/Wanfeng1028/SpaceLab';
const GITHUB_STARS_CACHE_KEY = 'spacelab_github_stars';
const SHARE_TEXT = '🚀 SpaceLab — An interactive space-themed portfolio built with Angular 21 & Three.js. Check it out!';

// 浅色页面路由
const LIGHT_THEME_ROUTES = ['/blog', '/article'];

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, SpaceGlassModalComponent],
})
export class NavbarComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private i18n = inject(I18nService);
  private destroyRef = inject(DestroyRef);
  private starsAbort: AbortController | null = null;

  readonly isHome = signal(true);
  readonly isScrolled = signal(false);
  readonly mobileMenuOpen = signal(false);
  readonly currentLang = signal<'zh-CN' | 'en-US'>('zh-CN');
  readonly showShareModal = signal(false);
  readonly githubStars = signal(0);
  readonly soundEnabled = signal<boolean>(true);
  readonly isLightTheme = signal(false);

  readonly navLinks = [
    { route: '/blog', labelKey: 'nav.blog' },
    { route: '/projects', labelKey: 'nav.projects' },
    { route: '/lab', labelKey: 'nav.lab' },
    { route: '/gallery', labelKey: 'nav.gallery' },
    { route: '/about', labelKey: 'nav.about' },
  ];

  ngOnInit(): void {
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((e) => {
        const url = e.urlAfterRedirects;
        this.isHome.set(url === '/' || url === '/home');
        this.isLightTheme.set(LIGHT_THEME_ROUTES.some(route => url.startsWith(route)));
        this.mobileMenuOpen.set(false);
      });

    // Check initial route
    const currentUrl = this.router.url;
    this.isLightTheme.set(LIGHT_THEME_ROUTES.some(route => currentUrl.startsWith(route)));

    this.i18n.loadTranslations(this.currentLang());
    this.loadGithubStars();
  }

  ngOnDestroy(): void {
    this.starsAbort?.abort();
  }

  @HostListener('window:scroll')
  onScroll(): void {
    this.isScrolled.set(window.scrollY > 20);
  }

  t(key: string): string {
    return this.i18n.t(key);
  }

  toggleLang(): void {
    const newLang = this.currentLang() === 'zh-CN' ? 'en-US' : 'zh-CN';
    this.currentLang.set(newLang);
    this.i18n.loadTranslations(newLang);
  }

  toggleSound(): void {
    this.soundEnabled.update(v => !v);
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen.update((v) => !v);
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }

  async onShare(): Promise<void> {
    try {
      await navigator.clipboard.writeText(window.location.origin);
    } catch {
      // Clipboard API may fail in some environments
    }
    this.showShareModal.set(true);
  }

  get currentUrl(): string {
    return window.location.origin;
  }

  private async loadGithubStars(): Promise<void> {
    // Try session cache first
    try {
      const cached = sessionStorage.getItem(GITHUB_STARS_CACHE_KEY);
      if (cached) {
        this.githubStars.set(Number(cached));
        return;
      }
    } catch {
      // sessionStorage may be unavailable
    }

    this.starsAbort?.abort();
    this.starsAbort = new AbortController();

    try {
      const res = await fetch(GITHUB_API_URL, { signal: this.starsAbort.signal });
      if (res.ok) {
        const data = await res.json();
        const count = data.stargazers_count ?? 0;
        this.githubStars.set(count);
        try {
          sessionStorage.setItem(GITHUB_STARS_CACHE_KEY, String(count));
        } catch {
          // Ignore storage errors
        }
      }
    } catch {
      // Silently fail — keep default 0
    }
  }

  shareTwitterUrl(): string {
    const text = encodeURIComponent(SHARE_TEXT);
    const url = encodeURIComponent(GITHUB_REPO_URL);
    return `https://twitter.com/intent/tweet?text=${text}&url=${url}`;
  }

  shareFacebookUrl(): string {
    const url = encodeURIComponent(GITHUB_REPO_URL);
    return `https://www.facebook.com/sharer/sharer.php?u=${url}`;
  }

  shareLinkedinUrl(): string {
    const url = encodeURIComponent(GITHUB_REPO_URL);
    return `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
  }
}
