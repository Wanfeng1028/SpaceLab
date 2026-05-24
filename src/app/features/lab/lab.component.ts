import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { I18nService } from '../../core/services/i18n.service';

@Component({
  selector: 'app-lab',
  templateUrl: './lab.html',
  styleUrl: './lab.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LabComponent {
  private i18n = inject(I18nService);

  readonly experiments = [
    { title: '粒子光场', icon: '✨', desc: 'Three.js 粒子系统 + 鼠标视差', tech: 'Three.js', status: 'live' as const },
    { title: '玻璃拟态卡片', icon: '🔮', desc: '8 种 Glassmorphism 变体', tech: 'CSS', status: 'live' as const },
    { title: '缓动曲线可视化', icon: '📈', desc: '可视化对比不同缓动函数', tech: 'GSAP', status: 'coming' as const },
    { title: '3D 文字变形', icon: '🔤', desc: '文字到粒子的 3D 变换动画', tech: 'Three.js', status: 'coming' as const },
    { title: '流体模拟', icon: '🌊', desc: 'WebGL 流体动力学模拟', tech: 'WebGL', status: 'coming' as const },
    { title: '音频可视化', icon: '🎵', desc: 'Web Audio API 频谱分析', tech: 'Canvas', status: 'coming' as const },
  ];

  t(key: string): string {
    return this.i18n.t(key);
  }
}
