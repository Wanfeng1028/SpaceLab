import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface CaptchaSession {
  captcha_id: string;
  imageUrl: string;
}

@Injectable({ providedIn: 'root' })
export class CaptchaService {
  private http = inject(HttpClient);

  /** 获取新的验证码 ID 和图片 URL */
  getNew(): Observable<CaptchaSession> {
    return this.http.get<{ captcha_id: string }>('/captcha/new').pipe(
      map(res => ({
        captcha_id: res.captcha_id,
        imageUrl: `/captcha/image/${res.captcha_id}`,
      }))
    );
  }
}
