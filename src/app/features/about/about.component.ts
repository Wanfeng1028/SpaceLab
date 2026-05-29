import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
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
    MatIconModule,
    MatTooltipModule,
    MatDividerModule,
    MatDialogModule,
    MatSnackBarModule,
  ],
  templateUrl: './about.html',
  styleUrl: './about.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AboutComponent {
  private readonly i18n = inject(I18nService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  readonly avatar = PROFILE.avatar;
  readonly name = PROFILE.name;
  readonly github = PROFILE.github;
  readonly email = PROFILE.email;

  readonly identityLabels = [
    'frontend',
    'fullstack',
    'aiBuilder',
    'llm',
    'gis',
    'resourceHub',
  ] as const;

  readonly focusAreas = [
    { key: 'ai', icon: '🧠', chips: ['LLM', 'Agent', 'AI Tools'] },
    { key: 'gis', icon: '🌍', chips: ['GIS', 'Map', 'Remote Sensing'] },
    { key: 'algorithm', icon: '📊', chips: ['Algorithm', 'Data', 'Visualization'] },
    { key: 'fullstack', icon: '💻', chips: ['Angular', 'Node.js', 'Deploy'] },
    { key: 'resource', icon: '🗄️', chips: ['AI News', 'Open Source', 'Resource Hub'] },
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
      panelClass: 'spacelab-mac-dialog-panel',
      backdropClass: 'spacelab-dialog-backdrop',
      autoFocus: false,
      restoreFocus: true,
      hasBackdrop: true,
      disableClose: false,
      width: 'min(92vw, 560px)',
      maxWidth: '92vw',
    });
  }

  async copyEmail(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.email);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = this.email;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    this.snackBar.open(this.t('about.emailCopied'), '', {
      duration: 2000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      panelClass: 'spacelab-snackbar',
    });
  }
}
