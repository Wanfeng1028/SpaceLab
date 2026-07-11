import {
  Component,
  inject,
  signal,
  AfterViewInit,
  OnDestroy,
  ChangeDetectionStrategy,
  DestroyRef,
} from '@angular/core';
import { Router, RouterLink, NavigationEnd } from '@angular/router';
import { I18nService } from '../../../core/services/i18n.service';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

interface FooterLink {
  label: string;
  href?: string;
  routerLink?: string;
  external?: boolean;
  disabled?: boolean;
}

interface FooterGroup {
  title: string;
  links: FooterLink[];
}

@Component({
  selector: 'app-footer',
  templateUrl: './footer.html',
  styleUrl: './footer.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
})
export class FooterComponent implements AfterViewInit, OnDestroy {
  private i18n = inject(I18nService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  /** sentinel 是否进入视口（是否处于页面底部区域） */
  readonly isAtBottom = signal(false);
  /** 页脚主体是否已收起（仅留触发条） */
  readonly isFooterCollapsed = signal(false);
  /** 指针是否悬停在页脚上 */
  readonly isFooterHovered = signal(false);
  /** 页脚内是否有键盘焦点 */
  readonly hasFooterFocus = signal(false);
  /** 当前是否处于音乐台路由（需抬高 bottom 以避开 sticky 播放栏） */
  readonly isMusicRoute = signal(false);

  private observer?: IntersectionObserver;
  private collapseTimer: ReturnType<typeof setTimeout> | null = null;

  readonly githubUrl = 'https://github.com/Wanfeng1028';
  readonly email = 'service.ai@outlook.com';

  get groups(): FooterGroup[] {
    return [
      {
        title: this.t('footer.navTitle'),
        links: [
          { label: this.t('footer.home'), routerLink: '/' },
          { label: this.t('footer.articles'), routerLink: '/blog' },
          { label: this.t('footer.projects'), routerLink: '/projects' },
          { label: this.t('footer.lab'), routerLink: '/lab' },
        ],
      },
      {
        title: this.t('footer.exploreTitle'),
        links: [
          { label: this.t('footer.aiFrontline'), routerLink: '/ai-frontline' },
          { label: this.t('footer.dashboard'), href: '/#cockpit' },
          { label: this.t('footer.gallery'), routerLink: '/ai-frontline' },
          { label: this.t('footer.articles'), routerLink: '/blog' },
        ],
      },
      {
        title: this.t('footer.connectTitle'),
        links: [
          { label: 'GitHub', href: this.githubUrl, external: true },
          { label: 'Email', href: `mailto:${this.email}` },
          { label: 'RSS', disabled: true },
          { label: this.t('footer.about'), routerLink: '/about' },
        ],
      },
      {
        title: this.t('footer.systemTitle'),
        links: [
          { label: this.t('footer.sitemap'), disabled: true },
          { label: this.t('footer.privacy'), disabled: true },
          { label: this.t('footer.changelog'), disabled: true },
          { label: this.t('footer.status'), disabled: true },
        ],
      },
    ];
  }

  t(key: string): string {
    return this.i18n.t(key);
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ── 生命周期 ──────────────────────────────────────
  ngAfterViewInit(): void {
    // 音乐台路由检测：抬高页脚避开 sticky 播放栏
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((e) => {
        this.isMusicRoute.set(e.urlAfterRedirects.startsWith('/music'));
      });
    this.isMusicRoute.set(this.router.url.startsWith('/music'));

    // 用 IntersectionObserver 检测底部 sentinel，不监听高频滚轮
    const sentinel = document.querySelector('.footer-sentinel');
    if (sentinel && 'IntersectionObserver' in window) {
      this.observer = new IntersectionObserver(
        (entries) => {
          const atBottom = !!entries[0]?.isIntersecting;
          this.isAtBottom.set(atBottom);
          if (atBottom) {
            this.expandFooter();
            this.scheduleCollapse();
          } else {
            // 离开底部区域：整体隐藏，不进入收起计时
            this.hideFooter();
          }
        },
        { root: null, rootMargin: '0px 0px -1px 0px', threshold: 0 },
      );
      this.observer.observe(sentinel);
    }
  }

  ngOnDestroy(): void {
    this.cancelCollapse();
    this.observer?.disconnect();
  }

  // ── 状态切换 ──────────────────────────────────────
  /** 完全展开并取消收起计时（悬停 / 聚焦 / 进入底部时调用） */
  private expandFooter(): void {
    this.isFooterCollapsed.set(false);
    this.cancelCollapse();
  }

  /** 离开底部区域：整体隐藏 */
  private hideFooter(): void {
    this.isFooterCollapsed.set(true);
    this.cancelCollapse();
  }

  /** 悬停 / 聚焦态变化后重启收起倒计时 */
  private scheduleCollapse(): void {
    this.cancelCollapse();
    if (!this.isAtBottom() || this.isFooterHovered() || this.hasFooterFocus()) {
      return;
    }
    this.collapseTimer = setTimeout(() => {
      this.isFooterCollapsed.set(true);
    }, 2500);
  }

  private cancelCollapse(): void {
    if (this.collapseTimer !== null) {
      clearTimeout(this.collapseTimer);
      this.collapseTimer = null;
    }
  }

  // ── 交互事件（由模板绑定） ───────────────────────
  onFooterEnter(): void {
    this.isFooterHovered.set(true);
    this.expandFooter();
  }

  onFooterLeave(): void {
    this.isFooterHovered.set(false);
    this.scheduleCollapse();
  }

  onFooterFocusIn(): void {
    this.hasFooterFocus.set(true);
    this.expandFooter();
  }

  onFooterFocusOut(): void {
    this.hasFooterFocus.set(false);
    this.scheduleCollapse();
  }

  toggleFooter(): void {
    if (this.isFooterCollapsed()) {
      this.isFooterCollapsed.set(false);
      this.scheduleCollapse();
    } else {
      this.isFooterCollapsed.set(true);
      this.cancelCollapse();
    }
  }
}
