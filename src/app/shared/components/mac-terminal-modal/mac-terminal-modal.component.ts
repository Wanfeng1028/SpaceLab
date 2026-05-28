import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  computed,
  HostListener,
  ElementRef,
  AfterViewInit,
  OnDestroy,
  ChangeDetectionStrategy,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';

export type MacTerminalSize = 'sm' | 'md' | 'lg' | 'fullscreen';

@Component({
  selector: 'app-mac-terminal-modal',
  templateUrl: './mac-terminal-modal.component.html',
  styleUrl: './mac-terminal-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
})
export class MacTerminalModalComponent implements AfterViewInit, OnDestroy {
  private elRef = inject(ElementRef);

  @Input() size: MacTerminalSize = 'md';
  @Input() title: string = 'spacelab @orbit: ~/session';
  @Input() showProgress: boolean = false;
  @Input() progressValue: number = 0;
  @Input() closable: boolean = true;
  @Input() closeOnBackdrop: boolean = true;
  @Input() closeOnEsc: boolean = true;

  @Output() closed = new EventEmitter<void>();
  @Output() opened = new EventEmitter<void>();

  isOpen = signal(false);
  private previousOverflow: string = '';
  private previousBodyOverflow: string = '';

  private readonly sizeMap: Record<MacTerminalSize, string> = {
    sm: 'min(400px, calc(100vw - 32px))',
    md: 'min(600px, calc(100vw - 48px))',
    lg: 'min(800px, calc(100vw - 64px))',
    fullscreen: 'calc(100vw - 32px)',
  };

  panelWidth = computed(() => this.sizeMap[this.size]);

  ngAfterViewInit(): void {
    // Immediately open for animation
    this.open();
  }

  ngOnDestroy(): void {
    this.restoreBodyScroll();
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.closeOnEsc && this.isOpen()) {
      this.close();
    }
  }

  open(): void {
    this.lockBodyScroll();
    this.isOpen.set(true);
    this.opened.emit();
  }

  close(): void {
    if (!this.closable) return;
    this.isOpen.set(false);
    this.restoreBodyScroll();
    this.closed.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if (this.closeOnBackdrop) {
      // Check if click target is the backdrop itself
      const target = event.target as HTMLElement;
      if (target.classList.contains('mac-terminal-modal')) {
        this.close();
      }
    }
  }

  private lockBodyScroll(): void {
    this.previousBodyOverflow = document.body.style.overflow;
    this.previousOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
  }

  private restoreBodyScroll(): void {
    document.body.style.overflow = this.previousBodyOverflow;
    document.documentElement.style.overflow = this.previousOverflow;
  }
}
