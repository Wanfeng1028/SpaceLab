import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';

/**
 * Google reCAPTCHA v3 服务
 * 在需要验证的地方调用 execute()
 */
@Injectable({ providedIn: 'root' })
export class RecaptchaService {
  private loaded = false;
  private loading: Promise<void> | null = null;

  /** 动态加载 reCAPTCHA 脚本 */
  private loadScript(): Promise<void> {
    if (this.loaded) return Promise.resolve();
    if (this.loading) return this.loading;

    const siteKey = environment.recaptchaSiteKey;
    if (!siteKey) {
      // 未配置时直接返回成功（开发环境）
      this.loaded = true;
      return Promise.resolve();
    }

    this.loading = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        this.loaded = true;
        resolve();
      };
      script.onerror = () => reject(new Error('Failed to load reCAPTCHA'));
      document.head.appendChild(script);
    });

    return this.loading;
  }

  /** 获取 reCAPTCHA token */
  async execute(action: string = 'submit'): Promise<string> {
    const siteKey = environment.recaptchaSiteKey;
    if (!siteKey) return ''; // 未配置时跳过

    await this.loadScript();

    return new Promise<string>((resolve) => {
      grecaptcha.ready(() => {
        grecaptcha.execute(siteKey, { action }).then((token: string) => {
          resolve(token);
        });
      });
    });
  }
}
