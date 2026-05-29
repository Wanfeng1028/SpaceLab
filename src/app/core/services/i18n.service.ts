import { Injectable, signal, computed, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { I18N_DICTIONARIES, SupportedLocale } from '../../../generated/content.generated';

const LOCALE_STORAGE_KEY = 'spacelab-locale';

@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  private readonly _locale = signal<SupportedLocale>(this.getInitialLocale());
  private _zhFlatMap: Record<string, string> = {};
  private _warnedKeys = new Set<string>();

  readonly locale = this._locale.asReadonly();
  readonly isZh = computed(() => this._locale() === 'zh-CN');
  readonly isEn = computed(() => this._locale() === 'en-US');

  private readonly _currentFlatMap = computed(() => {
    this._locale();
    const dict = I18N_DICTIONARIES[this._locale()] ?? {};
    return this.flatten(dict);
  });

  constructor() {
    this._zhFlatMap = this.flatten(I18N_DICTIONARIES['zh-CN'] ?? {});
  }

  async setLocale(locale: SupportedLocale): Promise<void> {
    this._locale.set(locale);
    if (this.isBrowser) {
      try {
        localStorage.setItem(LOCALE_STORAGE_KEY, locale);
        document.documentElement.lang = locale === 'zh-CN' ? 'zh-CN' : 'en';
      } catch {
        // Storage quota exceeded or unavailable
      }
    }
  }

  async toggleLocale(): Promise<void> {
    await this.setLocale(this._locale() === 'zh-CN' ? 'en-US' : 'zh-CN');
  }

  t(key: string): string {
    const flat = this._currentFlatMap();
    const value = flat[key] ?? this._zhFlatMap[key];
    if (value !== undefined) return value;

    if (!this._warnedKeys.has(key)) {
      this._warnedKeys.add(key);
      if (typeof ngDevMode !== 'undefined' && ngDevMode) {
        console.warn(`[i18n missing] ${this._locale()}: ${key}`);
      }
    }
    return key;
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

  private flatten(obj: Record<string, unknown>, prefix = ''): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (typeof value === 'object' && value !== null) {
        Object.assign(result, this.flatten(value as Record<string, unknown>, fullKey));
      } else {
        result[fullKey] = String(value);
      }
    }
    return result;
  }
}
