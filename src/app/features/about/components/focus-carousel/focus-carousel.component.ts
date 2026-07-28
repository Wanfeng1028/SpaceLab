import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  OnDestroy,
  signal,
  NgZone,
  HostListener,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';

interface FocusCard {
  id: string;
  num: string;
  icon: string;
  title: string;
  desc: string;
  tags: string[];
}

@Component({
  selector: 'app-focus-carousel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './focus-carousel.component.html',
  styleUrl: './focus-carousel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FocusCarouselComponent implements OnInit, OnDestroy {
  private readonly ngZone = inject(NgZone);
  readonly activeIndex = signal(0);

  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly interval = 4000;

  readonly cards: FocusCard[] = [
    {
      id: 'ai-llm',
      num: '01',
      icon: '✦',
      title: 'AI / LLM',
      desc: '关注大语言模型、Agent、AI 工具链和智能体产品形态。',
      tags: ['LLM', 'Agent', 'AI Tools'],
    },
    {
      id: 'gis',
      num: '02',
      icon: '◉',
      title: 'GIS',
      desc: '关注地图服务、空间数据处理和地理信息系统的构建与应用。',
      tags: ['GIS', 'Map', 'Spatial Data'],
    },
    {
      id: 'remote-sensing',
      num: '03',
      icon: '◎',
      title: '遥感与数字地球',
      desc: '关注遥感影像解译、对地观测技术和数字地球平台开发。',
      tags: ['Remote Sensing', 'Digital Earth', 'Observation'],
    },
    {
      id: 'algorithm',
      num: '04',
      icon: '▤',
      title: '算法',
      desc: '关注数据结构、算法逻辑、性能优化和计算问题的工程化求解。',
      tags: ['Algorithm', 'Data Structure', 'Optimization'],
    },
    {
      id: 'dev-tech',
      num: '05',
      icon: '◈',
      title: '开发技术',
      desc: '关注前后端框架、工程实践、部署运维和新技术的工程落地。',
      tags: ['Frontend', 'Backend', 'DevOps'],
    },
  ];

  ngOnInit(): void {
    this.startAutoPlay();
  }

  ngOnDestroy(): void {
    this.stopAutoPlay();
  }

  @HostListener('document:visibilitychange')
  onVisibilityChange(): void {
    document.hidden ? this.stopAutoPlay() : this.startAutoPlay();
  }

  startAutoPlay(): void {
    this.stopAutoPlay();
    this.ngZone.runOutsideAngular(() => {
      this.timer = setInterval(() => this.scrollNext(), this.interval);
    });
  }

  stopAutoPlay(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  goTo(index: number): void {
    if (index === this.activeIndex()) return;
    this.activeIndex.set(index);
    this.startAutoPlay();
  }

  prev(): void {
    const idx = this.activeIndex();
    this.goTo(idx > 0 ? idx - 1 : this.cards.length - 1);
  }

  next(): void {
    this.scrollNext();
  }

  private scrollNext(): void {
    const nextIdx = (this.activeIndex() + 1) % this.cards.length;
    this.goTo(nextIdx);
  }
}
