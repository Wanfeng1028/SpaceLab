import {
  Component,
  ChangeDetectionStrategy,
  Input,
  Output,
  EventEmitter,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-search-box',
  templateUrl: './search-box.component.html',
  styleUrl: './search-box.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
})
export class SearchBoxComponent {
  @Input() placeholder = 'Search...';
  @Input() value = '';
  @Output() valueChange = new EventEmitter<string>();
  @Output() search = new EventEmitter<string>();

  searchValue = signal('');

  onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchValue.set(input.value);
    this.valueChange.emit(input.value);
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.search.emit(this.searchValue());
    }
  }

  onSearchClick(): void {
    this.search.emit(this.searchValue());
  }
}