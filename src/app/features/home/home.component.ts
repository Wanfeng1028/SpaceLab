import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  inject,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { I18nService } from '../../core/services/i18n.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.html',
  styleUrl: './home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
})
export class HomeComponent implements OnInit {
  private router = inject(Router);
  private i18n = inject(I18nService);

  ngOnInit(): void {
    this.i18n.loadTranslations('zh-CN');
  }

  t(key: string): string {
    return this.i18n.t(key);
  }

  onEnter(): void {
    // 引导至 Projects 页面
    this.router.navigate(['/projects']);
  }

  onContact(): void {
    // 唤起邮件联系
    window.location.href = 'mailto:hello@spacelab.dev?subject=Hi Gruev!';
  }
}
