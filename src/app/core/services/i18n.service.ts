import { Injectable, signal, computed, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

import zhCN from '../../i18n/zh-CN.json';
import enUS from '../../i18n/en-US.json';

export type SupportedLocale = 'zh-CN' | 'en-US';

const TRANSLATIONS: Record<SupportedLocale, Record<string, any>> = {
  'zh-CN': zhCN as Record<string, any>,
  'en-US': enUS as Record<string, any>,
};

const LOCALE_STORAGE_KEY = 'spacelab-locale';

@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  private readonly _locale = signal<SupportedLocale>(this.getInitialLocale());
  private _flatMap: Record<string, string> = {};

  readonly locale = this._locale.asReadonly();

  readonly isZh = computed(() => this._locale() === 'zh-CN');
  readonly isEn = computed(() => this._locale() === 'en-US');

  loadTranslations(locale: SupportedLocale): void {
    this._flatMap = this.flatten(TRANSLATIONS[locale] ?? {});
    this._locale.set(locale);
    if (this.isBrowser) {
      try {
        localStorage.setItem(LOCALE_STORAGE_KEY, locale);
      } catch {
        // Storage quota exceeded or unavailable
      }
    }
  }

  t(key: string): string {
    return this._flatMap[key] ?? key;
  }

  toggleLocale(): void {
    const next = this._locale() === 'zh-CN' ? 'en-US' : 'zh-CN';
    this.loadTranslations(next);
  }

  private getInitialLocale(): SupportedLocale {
    if (!this.isBrowser) return 'zh-CN';
    try {
      const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
      if (stored === 'zh-CN' || stored === 'en-US') return stored;
    } catch {
      // localStorage unavailable
    }
    return 'zh-CN';
  }
}
