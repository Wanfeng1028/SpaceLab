import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { I18nService } from '../../core/services/i18n.service';
import { GalleryCardComponent } from '../../shared/components/cards/gallery-card.component';

@Component({
  selector: 'app-gallery',
  templateUrl: './gallery.html',
  styleUrl: './gallery.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [GalleryCardComponent],
})
export class GalleryComponent {
  private i18n = inject(I18nService);

  readonly selectedType = signal('all');

  readonly allItems = [
    { title: '光场实验 #1', icon: '💡', type: 'Three.js', bgColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
    { title: '粒子系统', icon: '✨', type: 'WebGL', bgColor: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
    { title: '玻璃拟态', icon: '🔮', type: 'CSS', bgColor: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
    { title: '流体模拟', icon: '🌊', type: 'WebGL', bgColor: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' },
    { title: '缓动曲线', icon: '📈', type: 'GSAP', bgColor: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' },
    { title: '3D 文字', icon: '🔤', type: 'Three.js', bgColor: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)' },
    { title: '音频可视化', icon: '🎵', type: 'Canvas', bgColor: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)' },
    { title: '数据图表', icon: '📊', type: 'D3.js', bgColor: 'linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)' },
    { title: '交互动画', icon: '🎯', type: 'GSAP', bgColor: 'linear-gradient(135deg, #fddb92 0%, #d1fdff 100%)' },
  ];

  readonly types = computed(() => {
    const t = new Set(this.allItems.map((i) => i.type));
    return ['all', ...Array.from(t)];
  });

  readonly filteredItems = computed(() => {
    const type = this.selectedType();
    if (type === 'all') return this.allItems;
    return this.allItems.filter((i) => i.type === type);
  });

  t(key: string): string {
    return this.i18n.t(key);
  }

  selectType(type: string): void {
    this.selectedType.set(type);
  }
}
