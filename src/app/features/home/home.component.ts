import { Component, OnInit } from '@angular/core';
import { I18nService } from '../../core/services/i18n.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class HomeComponent implements OnInit {
  constructor(private i18n: I18nService) {}

  ngOnInit(): void {
    this.i18n.loadTranslations('zh-CN');
  }

  t(key: string): string {
    return this.i18n.t(key);
  }

  scrollToPortal(): void {
    document.getElementById('portal')?.scrollIntoView({ behavior: 'smooth' });
  }

  scrollToContact(): void {
    document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
  }
}
