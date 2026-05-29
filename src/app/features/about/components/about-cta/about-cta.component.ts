import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ContactDialogComponent } from '../../../../shared/components/contact-dialog/contact-dialog.component';
import { I18nService } from '../../../../core/services/i18n.service';

@Component({
  selector: 'app-about-cta',
  standalone: true,
  imports: [CommonModule, RouterLink, MatDialogModule],
  templateUrl: './about-cta.component.html',
  styleUrl: './about-cta.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AboutCtaComponent {
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly i18n = inject(I18nService);

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
}
