import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface CaptchaSession {
  captcha_id: string;
  imageUrl: string;
}

@Injectable({ providedIn: 'root' })
export class CaptchaService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  /** 获取新的验证码 ID 和图片 URL */
  getNew(): Observable<CaptchaSession> {
    return this.http.get<{ captcha_id: string }>(`${this.apiUrl}/captcha/new`).pipe(
      map(res => ({
        captcha_id: res.captcha_id,
        imageUrl: `/captcha/${res.captcha_id}.png`,
      })),
      catchError(() => {
        // fallback: 用根路由（captcha 注册在根路由非 /api/v1 下）
        return this.http.get<{ captcha_id: string }>('/captcha/new').pipe(
          map(res => ({
            captcha_id: res.captcha_id,
            imageUrl: `/captcha/${res.captcha_id}.png`,
          }))
        );
      })
    );
  }
}
