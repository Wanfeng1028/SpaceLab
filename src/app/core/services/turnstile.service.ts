import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';

/**
 * Cloudflare Turnstile 服务
 * - 全站加载（页面初始化时注入脚本）
 * - 登录/注册页展示可视化复选框
 * - 提交时自动获取 token
 */
@Injectable({ providedIn: 'root' })
export class TurnstileService {
  private loaded = false;

  constructor() {
    this.loadScript();
  }

  /** 动态加载 Turnstile 脚本（全站加载） */
  private loadScript(): void {
    const siteKey = environment.turnstileSiteKey;
    if (!siteKey || this.loaded) return;

    // 避免重复加载
    if (document.querySelector('script[src*="turnstile"]')) {
      this.loaded = true;
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    script.async = true;
    script.defer = true;
    script.onload = () => { this.loaded = true; };
    document.head.appendChild(script);
  }

  /** 获取 Turnstile widget 的 token（需页面中有 .cf-turnstile 元素） */
  getToken(widgetId?: string): string {
    if (typeof turnstile === 'undefined') return '';
    try {
      return turnstile.getResponse(widgetId);
    } catch {
      return '';
    }
  }

  /** 手动渲染 widget 到指定元素 ID */
  render(elementId: string): string | undefined {
    if (typeof turnstile === 'undefined' || !environment.turnstileSiteKey) return undefined;
    try {
      return turnstile.render(elementId, {
        sitekey: environment.turnstileSiteKey,
        theme: 'dark',
      });
    } catch {
      return undefined;
    }
  }

  /** 重置 widget */
  reset(widgetId?: string): void {
    if (typeof turnstile === 'undefined') return;
    try {
      turnstile.reset(widgetId);
    } catch { /* ignore */ }
  }

  /** 站点密钥是否已配置 */
  get isConfigured(): boolean {
    return !!environment.turnstileSiteKey;
  }
}
