import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { I18nService } from '../../../core/services/i18n.service';

export interface ResourceDetailData {
  title: string;
  summary: string;
  category: string;
  categoryLabel: string;
  source: string;
  url: string;
  tags: string[];
  date: string;
  fetchedAt?: string;
  i18nPrefix: string;
}

@Component({
  selector: 'app-resource-detail-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatChipsModule,
    MatIconModule,
    MatDividerModule,
  ],
  templateUrl: './resource-detail-dialog.component.html',
  styleUrl: './resource-detail-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResourceDetailDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<ResourceDetailDialogComponent>);
  private readonly i18n = inject(I18nService);
  readonly data = inject<ResourceDetailData>(MAT_DIALOG_DATA);

  t(key: string): string {
    return this.i18n.t(key);
  }

  close(): void {
    this.dialogRef.close();
  }

  openUrl(): void {
    window.open(this.data.url, '_blank', 'noopener,noreferrer');
  }
}
