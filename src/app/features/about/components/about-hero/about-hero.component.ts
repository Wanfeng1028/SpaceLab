import { Component, inject, ChangeDetectionStrategy, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ContactDialogComponent } from '../../../../shared/components/contact-dialog/contact-dialog.component';
import { I18nService } from '../../../../core/services/i18n.service';

@Component({
  selector: 'app-about-hero',
  standalone: true,
  imports: [CommonModule, MatDialogModule],
  templateUrl: './about-hero.component.html',
  styleUrl: './about-hero.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AboutHeroComponent {
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly i18n = inject(I18nService);

  avatar = input.required<string>();
  name = input.required<string>();
  labels = input.required<string[]>();
  bio = input.required<string>();

  t(key: string): string {
    return this.i18n.t(key);
  }

  openContact(): void {
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

  goHome(): void {
    this.router.navigate(['/']);
  }
}
