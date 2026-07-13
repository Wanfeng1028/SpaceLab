import {
  Component,
  inject,
  signal,
  input,
  effect,
  AfterViewInit,
  OnDestroy,
  ChangeDetectionStrategy,
  DestroyRef,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { I18nService } from '../../../core/services/i18n.service';
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

  /**
   * 首页模式：启用 fixed + 自动隐藏/重新显示。
   * 非首页：普通文档流，不固定、不收起、不渲染触发条 / sentinel / Observer。
   */
  readonly autoHide = input(false);

  /** sentinel 是否进入视口（仅首页模式有意义） */
  readonly isAtBottom = signal(false);
  /** 页脚主体是否已收起（仅留触发条） */
  readonly isFooterCollapsed = signal(false);
  /** 指针是否悬停在页脚上 */
  readonly isFooterHovered = signal(false);
  /** 页脚内是否有键盘焦点 */
  readonly hasFooterFocus = signal(false);

  private observer?: IntersectionObserver;
  private collapseTimer: ReturnType<typeof setTimeout> | null = null;

  readonly githubUrl = 'https://github.com/Wanfeng1028';
  readonly email = 'service.ai@outlook.com';

  constructor() {
    // 离开首页模式时立即清理：取消计时、断开观察、复位为普通文档流
    effect(() => {
      if (!this.autoHide()) {
        this.cancelCollapse();
        this.disconnectObserver();
        this.isAtBottom.set(false);
        this.isFooterCollapsed.set(false);
        this.isFooterHovered.set(false);
        this.hasFooterFocus.set(false);
      }
    });
  }

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
    // Footer 不再自行订阅路由：是否启用自动隐藏由根组件的 autoHide 输入决定
    // 仅在首页模式下建立 IntersectionObserver 监听底部 sentinel
    this.setupObserverForAutoHide();
  }

  ngOnDestroy(): void {
    this.cancelCollapse();
    this.disconnectObserver();
  }

  /**
   * 仅首页模式下监听底部 sentinel。
   * 非首页：不创建 Observer，不监听任何滚动信号。
   */
  private setupObserverForAutoHide(): void {
    if (!this.autoHide()) {
      return;
    }
    const sentinel = document.querySelector('.footer-sentinel');
    if (!sentinel || !('IntersectionObserver' in window)) {
      return;
    }
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

  private disconnectObserver(): void {
    this.observer?.disconnect();
    this.observer = undefined;
  }

  // ── 状态切换（仅首页模式调用） ──────────────────────
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

  // ── 交互事件（由模板绑定，仅首页模式渲染触发条与监听） ───
  onFooterEnter(): void {
    if (!this.autoHide()) {
      return;
    }
    this.isFooterHovered.set(true);
    this.expandFooter();
  }

  onFooterLeave(): void {
    if (!this.autoHide()) {
      return;
    }
    this.isFooterHovered.set(false);
    this.scheduleCollapse();
  }

  onFooterFocusIn(): void {
    if (!this.autoHide()) {
      return;
    }
    this.hasFooterFocus.set(true);
    this.expandFooter();
  }

  onFooterFocusOut(): void {
    if (!this.autoHide()) {
      return;
    }
    this.hasFooterFocus.set(false);
    this.scheduleCollapse();
  }

  toggleFooter(): void {
    if (!this.autoHide()) {
      return;
    }
    if (this.isFooterCollapsed()) {
      this.isFooterCollapsed.set(false);
      this.scheduleCollapse();
    } else {
      this.isFooterCollapsed.set(true);
      this.cancelCollapse();
    }
  }
}
