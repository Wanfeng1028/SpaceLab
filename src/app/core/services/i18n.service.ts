import { Injectable, signal, computed } from '@angular/core';

import zhCN from '../../i18n/zh-CN.json';
import enUS from '../../i18n/en-US.json';

export type SupportedLocale = 'zh-CN' | 'en-US';

const TRANSLATIONS: Record<SupportedLocale, Record<string, any>> = {
  'zh-CN': zhCN as Record<string, any>,
  'en-US': enUS as Record<string, any>,
};

@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly _locale = signal<SupportedLocale>('zh-CN');
  private _translations: Record<string, any> = {};

  readonly locale = this._locale.asReadonly();

  readonly isZh = computed(() => this._locale() === 'zh-CN');
  readonly isEn = computed(() => this._locale() === 'en-US');

  loadTranslations(locale: SupportedLocale): void {
    this._translations = TRANSLATIONS[locale] ?? {};
    this._locale.set(locale);
  }

  t(key: string): string {
    return key.split('.').reduce((obj: any, k) => obj?.[k], this._translations) ?? key;
  }

  toggleLocale(): void {
    const next = this._locale() === 'zh-CN' ? 'en-US' : 'zh-CN';
    this.loadTranslations(next);
  }
}
