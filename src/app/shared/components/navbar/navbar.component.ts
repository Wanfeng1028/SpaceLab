import {
  Component,
  inject,
  signal,
  OnInit,
  HostListener,
  ChangeDetectionStrategy,
} from '@angular/core';
import { Router, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { I18nService } from '../../../core/services/i18n.service';
import { filter } from 'rxjs';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive],
})
export class NavbarComponent implements OnInit {
  private router = inject(Router);
  private i18n = inject(I18nService);

  readonly isHome = signal(true);
  readonly isScrolled = signal(false);
  readonly isHidden = signal(false);
  readonly mobileMenuOpen = signal(false);
  readonly currentLang = signal<'zh-CN' | 'en-US'>('zh-CN');

  private lastScrollY = 0;
  private scrollThreshold = 80;

  readonly navLinks = [
    { route: '/blog', labelKey: 'nav.blog' },
    { route: '/projects', labelKey: 'nav.projects' },
    { route: '/lab', labelKey: 'nav.lab' },
    { route: '/gallery', labelKey: 'nav.gallery' },
    { route: '/about', labelKey: 'nav.about' },
  ];

  ngOnInit(): void {
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => {
        this.isHome.set(e.urlAfterRedirects === '/' || e.urlAfterRedirects === '/home');
        this.mobileMenuOpen.set(false);
      });

    this.i18n.loadTranslations(this.currentLang());
  }

  @HostListener('window:scroll')
  onScroll(): void {
    const scrollY = window.scrollY;
    this.isScrolled.set(scrollY > 20);

    // 在首页 Hero 区域内隐藏导航栏
    if (this.isHome() && scrollY < this.scrollThreshold) {
      this.isHidden.set(true);
    } else {
      this.isHidden.set(false);
    }

    this.lastScrollY = scrollY;
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
}
