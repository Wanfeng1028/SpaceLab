import { Injectable, inject } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';

export interface SeoData {
  title: string;
  description: string;
  canonical?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogUrl?: string;
  ogType?: 'article' | 'website' | 'profile';
  twitterCard?: 'summary' | 'summary_large_image';
  noIndex?: boolean;
}

const BASE_URL = 'https://wanfeng1028.github.io/SpaceLab';
const DEFAULT_IMAGE = '/assets/og-default.png';

@Injectable({ providedIn: 'root' })
export class SeoService {
  private title = inject(Title);
  private meta = inject(Meta);

  set(data: SeoData): void {
    // Title
    this.title.setTitle(data.title);

    // Meta description
    if (data.description) {
      this.meta.updateTag({ name: 'description', content: data.description });
    }

    // Canonical
    if (data.canonical) {
      this.meta.updateTag({ rel: 'canonical', href: data.canonical });
    } else {
      this.meta.removeTag('rel=canonical');
    }

    // Open Graph
    const ogUrl = data.ogUrl || data.canonical || BASE_URL;
    this.meta.updateTag({ property: 'og:title', content: data.ogTitle || data.title });
    this.meta.updateTag({ property: 'og:description', content: data.ogDescription || data.description });
    this.meta.updateTag({ property: 'og:url', content: ogUrl });
    this.meta.updateTag({ property: 'og:type', content: data.ogType || 'website' });
    this.meta.updateTag({ property: 'og:image', content: data.ogImage || DEFAULT_IMAGE });

    // Twitter Card
    this.meta.updateTag({ name: 'twitter:card', content: data.twitterCard || 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: data.ogTitle || data.title });
    this.meta.updateTag({ name: 'twitter:description', content: data.ogDescription || data.description });
    this.meta.updateTag({ name: 'twitter:image', content: data.ogImage || DEFAULT_IMAGE });

    // Robots
    if (data.noIndex) {
      this.meta.updateTag({ name: 'robots', content: 'noindex, nofollow' });
    } else {
      this.meta.updateTag({ name: 'robots', content: 'index, follow' });
    }
  }

  /** 默认站点 SEO */
  setDefault(): void {
    this.set({
      title: 'TesoroHome — Personal Digital Space',
      description: 'A personal digital space for code, science visualization and WebGL experiments.',
      canonical: BASE_URL,
      ogUrl: BASE_URL,
      ogType: 'website',
    });
  }

  /** 文章页 SEO */
  setArticle(title: string, description: string, slug: string, image?: string): void {
    this.set({
      title: `${title} — TesoroHome`,
      description: description || 'Read article on TesoroHome',
      canonical: `${BASE_URL}/blog/${slug}`,
      ogUrl: `${BASE_URL}/blog/${slug}`,
      ogTitle: title,
      ogDescription: description,
      ogImage: image || DEFAULT_IMAGE,
      ogType: 'article',
    });
  }
}
