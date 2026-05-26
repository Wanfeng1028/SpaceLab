import {
  Component,
  inject,
  signal,
  OnInit,
  HostListener,
  ChangeDetectionStrategy,
  DestroyRef,
} from '@angular/core';
import { Router, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { I18nService } from '../../../core/services/i18n.service';
import { SpaceGlassModalComponent } from '../glass/modal/space-glass-modal.component';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, SpaceGlassModalComponent],
})
export class NavbarComponent implements OnInit {
  private router = inject(Router);
  private i18n = inject(I18nService);
  private destroyRef = inject(DestroyRef);

  readonly isHome = signal(true);
  readonly isScrolled = signal(false);
  readonly mobileMenuOpen = signal(false);
  readonly currentLang = signal<'zh-CN' | 'en-US'>('zh-CN');
  readonly showShareModal = signal(false);

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
        this.isHome.set(e.urlAfterRedirects === '/' || e.urlAfterRedirects === '/home');
        this.mobileMenuOpen.set(false);
      });

    this.i18n.loadTranslations(this.currentLang());
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

  shareTwitterUrl(): string {
    const text = encodeURIComponent('🚀 SpaceLab — An interactive space-themed portfolio built with Angular 21 & Three.js. Check it out!');
    const url = encodeURIComponent('https://wanfeng1028.github.io/SpaceLab/');
    return `https://twitter.com/intent/tweet?text=${text}&url=${url}`;
  }

  shareFacebookUrl(): string {
    const url = encodeURIComponent('https://wanfeng1028.github.io/SpaceLab/');
    return `https://www.facebook.com/sharer/sharer.php?u=${url}`;
  }

  shareLinkedinUrl(): string {
    const url = encodeURIComponent('https://wanfeng1028.github.io/SpaceLab/');
    return `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
  }
}
