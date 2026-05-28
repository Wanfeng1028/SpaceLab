import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  ElementRef,
  inject,
  effect,
  OnDestroy,
} from '@angular/core';
import { I18nService } from '../../../core/services/i18n.service';
import { PROFILE } from '../../../../generated/content.generated';

@Component({
  selector: 'space-capsule-modal',
  templateUrl: './space-capsule-modal.html',
  styleUrl: './space-capsule-modal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpaceCapsuleModalComponent implements OnDestroy {
  private elRef = inject(ElementRef);
  private i18n = inject(I18nService);

  readonly isOpen = input(false);
  readonly triggerEl = input<HTMLElement | null>(null);
  readonly closed = output<void>();

  readonly closing = signal(false);
  private previousActiveElement: HTMLElement | null = null;

  readonly profileName = PROFILE.name;
  readonly profileAvatar = PROFILE.avatar;
  readonly profileGithub = PROFILE.github;
  readonly profileInterests = PROFILE.interests;

  constructor() {
    effect(() => {
      console.log('[SpaceCapsule] isOpen:', this.isOpen());
      if (this.isOpen()) {
        this.onOpen();
      }
    });
  }

  ngOnDestroy(): void {
    document.body.style.overflow = '';
    this.restoreFocus();
  }

  t(key: string): string {
    return this.i18n.t(key);
  }

  onOverlayClick(e: MouseEvent): void {
    if ((e.target as HTMLElement).classList.contains('scm-overlay')) {
      e.stopPropagation();
      this.close();
    }
  }

  close(): void {
    if (this.closing()) return;
    this.closing.set(true);
    this.closed.emit();
    document.body.style.overflow = '';
    setTimeout(() => {
      this.closing.set(false);
    }, 280);
  }

  onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      this.close();
      return;
    }
    if (e.key === 'Tab') {
      this.trapFocus(e);
    }
  }

  private onOpen(): void {
    this.previousActiveElement = (this.triggerEl() ?? document.activeElement) as HTMLElement;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => {
      const panel = this.elRef.nativeElement.querySelector('.scm-panel') as HTMLElement;
      if (!panel) return;
      const firstFocusable = panel.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      firstFocusable?.focus();
    });
  }

  private trapFocus(event: KeyboardEvent): void {
    const panel = this.elRef.nativeElement.querySelector('.scm-panel') as HTMLElement;
    if (!panel) return;
    const focusable = panel.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  private restoreFocus(): void {
    this.previousActiveElement?.focus();
    this.previousActiveElement = null;
  }
}
