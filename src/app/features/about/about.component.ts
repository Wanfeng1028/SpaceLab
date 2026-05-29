import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { I18nService } from '../../core/services/i18n.service';
import { PROFILE } from '../../../generated/content.generated';
import { ContactDialogComponent } from '../../shared/components/contact-dialog/contact-dialog.component';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatChipsModule,
    MatTooltipModule,
    MatDividerModule,
    MatDialogModule,
  ],
  templateUrl: './about.html',
  styleUrl: './about.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AboutComponent {
  private readonly i18n = inject(I18nService);
  private readonly dialog = inject(MatDialog);

  readonly avatar = PROFILE.avatar;
  readonly name = PROFILE.name;
  readonly github = PROFILE.github;
  readonly email = PROFILE.email;

  readonly focusAreas = [
    { key: 'ai', icon: '🧠' },
    { key: 'gis', icon: '🌍' },
    { key: 'algorithm', icon: '📊' },
    { key: 'fullstack', icon: '💻' },
    { key: 'resource', icon: '🗄️' },
  ] as const;

  readonly spacelabModules = [
    { key: 'aiFrontline', icon: '📡' },
    { key: 'lab', icon: '🧪' },
    { key: 'projects', icon: '🚀' },
    { key: 'articles', icon: '📝' },
  ] as const;

  t(key: string): string {
    return this.i18n.t(key);
  }

  openContactDialog(): void {
    this.dialog.open(ContactDialogComponent, {
      panelClass: 'spacelab-dialog-panel',
      maxWidth: 'min(420px, calc(100vw - 32px))',
      width: '100%',
      autoFocus: false,
    });
  }
}
