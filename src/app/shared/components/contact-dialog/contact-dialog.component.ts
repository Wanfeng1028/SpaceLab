import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { I18nService } from '../../../core/services/i18n.service';
import { PROFILE } from '../../../../generated/content.generated';

@Component({
  selector: 'app-contact-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatSnackBarModule,
  ],
  templateUrl: './contact-dialog.component.html',
  styleUrl: './contact-dialog.component.scss',
})
export class ContactDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<ContactDialogComponent>);
  private readonly snackBar = inject(MatSnackBar);
  private readonly i18n = inject(I18nService);

  readonly email = PROFILE.email;
  readonly github = PROFILE.github;
  readonly githubUser = 'Wanfeng1028';

  t(key: string): string {
    return this.i18n.t(key);
  }

  openGithub(): void {
    window.open(this.github, '_blank', 'noopener,noreferrer');
  }

  sendEmail(): void {
    window.open(`mailto:${this.email}`, '_self');
  }

  async copyEmail(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.email);
      this.snackBar.open(this.t('about.emailCopied'), '', {
        duration: 2000,
        horizontalPosition: 'center',
        verticalPosition: 'bottom',
      });
    } catch {
      // Fallback: select-and-copy
      const textarea = document.createElement('textarea');
      textarea.value = this.email;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      this.snackBar.open(this.t('about.emailCopied'), '', {
        duration: 2000,
      });
    }
  }

  close(): void {
    this.dialogRef.close();
  }
}
