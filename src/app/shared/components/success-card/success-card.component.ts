import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-success-card',
  templateUrl: './success-card.component.html',
  styleUrl: './success-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SuccessCardComponent {
  @Input() title = 'Keys to Success';
  @Input() paragraph = 'Best way to be success in your life.';
  @Input() items: string[] = [];
  @Input() buttonText = 'Get Your Success';
  @Input() showButton = true;

  @Output() buttonClick = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();

  onButtonClick(): void {
    this.buttonClick.emit();
  }

  onClose(): void {
    this.closed.emit();
  }
}
