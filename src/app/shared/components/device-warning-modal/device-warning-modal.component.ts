import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
} from '@angular/core';

@Component({
  selector: 'app-device-warning-modal',
  templateUrl: './device-warning-modal.component.html',
  styleUrl: './device-warning-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeviceWarningModalComponent {
  readonly visible = input(false);
  readonly closed = output<void>();

  onClose(): void {
    this.closed.emit();
  }
}
