import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '../../core/services/i18n.service';
import { PROFILE, ABOUT } from '../../../generated/content.generated';
import { AboutHeroComponent } from './components/about-hero/about-hero.component';
import { FocusCarouselComponent } from './components/focus-carousel/focus-carousel.component';
import { AboutCtaComponent } from './components/about-cta/about-cta.component';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule, AboutHeroComponent, FocusCarouselComponent, AboutCtaComponent],
  templateUrl: './about.html',
  styleUrl: './about.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AboutComponent {
  readonly avatar = PROFILE.avatar;
  readonly name = PROFILE.name;
  readonly labels = ABOUT.identityLabels;
  readonly bio = ABOUT.hero.description;
}
