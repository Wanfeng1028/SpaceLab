import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '../../../core/services/i18n.service';

interface FooterLink {
  label: string;
  href: string;
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
export class FooterComponent {
  private i18n = inject(I18nService);

  readonly githubUrl = 'https://github.com/Wanfeng1028';
  readonly email = 'hello@spacelab.dev';

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
          { label: this.t('footer.about'), routerLink: '/about' },
          { label: this.t('footer.archive'), routerLink: '/archive' },
          { label: this.t('footer.gallery'), routerLink: '/ai-frontline', disabled: false },
        ],
      },
      {
        title: this.t('footer.connectTitle'),
        links: [
          { label: 'GitHub', href: this.githubUrl, external: true },
          { label: 'Email', href: `mailto:${this.email}` },
          { label: 'RSS', href: '#', disabled: true },
          { label: this.t('footer.about'), routerLink: '/about' },
        ],
      },
      {
        title: this.t('footer.systemTitle'),
        links: [
          { label: this.t('footer.sitemap'), href: '#', disabled: true },
          { label: this.t('footer.privacy'), href: '#', disabled: true },
          { label: this.t('footer.changelog'), href: '#', disabled: true },
          { label: this.t('footer.status'), href: '#', disabled: true },
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
}
