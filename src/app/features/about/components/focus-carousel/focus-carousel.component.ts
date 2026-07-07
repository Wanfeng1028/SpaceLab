import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  OnDestroy,
  ElementRef,
  viewChild,
  signal,
  NgZone,
  HostListener,
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
  readonly trackEl = viewChild<ElementRef<HTMLElement>>('track');

  readonly activeIndex = signal(0);
  readonly total = signal(0);

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
      id: 'web',
      num: '02',
      icon: '◈',
      title: 'Web 前端工程',
      desc: '关注 Angular、TypeScript、SCSS、交互体验和前端工程化。',
      tags: ['Angular', 'TypeScript', 'SCSS'],
    },
    {
      id: 'gis',
      num: '03',
      icon: '◉',
      title: 'GIS 与空间可视化',
      desc: '关注地图、遥感、空间数据和地理信息可视化表达。',
      tags: ['GIS', 'Map', 'Visualization'],
    },
    {
      id: 'resources',
      num: '04',
      icon: '▣',
      title: '资源合集与内容整理',
      desc: '整理 AI 工具、开源项目、模型框架和开发资源。',
      tags: ['Resource', 'Open Source', 'Lab'],
    },
    {
      id: 'webgl',
      num: '05',
      icon: '◆',
      title: 'WebGL 与视觉实验',
      desc: '用 Three.js、动画和可视化技术做更有空间感的网页体验。',
      tags: ['Three.js', 'WebGL', 'Motion'],
    },
  ];

  constructor(private readonly ngZone: NgZone) {}

  ngOnInit(): void {
    this.total.set(this.cards.length);
    this.startAutoPlay();
  }

  ngOnDestroy(): void {
    this.stopAutoPlay();
  }

  @HostListener('document:visibilitychange')
  onVisibilityChange(): void {
    document.hidden ? this.stopAutoPlay() : this.startAutoPlay();
  }

  // ── Auto-play ──────────────────────────────────────────────────────

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

  // ── Navigation ─────────────────────────────────────────────────────

  goTo(index: number): void {
    const track = this.trackEl()?.nativeElement;
    if (!track) return;

    const card = track.querySelector<HTMLElement>(`.focus__card:nth-child(${index + 1})`);
    if (!card) return;

    track.scrollTo({ left: card.offsetLeft - track.offsetLeft, behavior: 'smooth' });
    this.setActive(index);
  }

  prev(): void {
    const idx = this.activeIndex();
    this.goTo(idx > 0 ? idx - 1 : this.cards.length - 1);
  }

  next(): void {
    this.scrollNext();
  }

  onScroll(): void {
    const track = this.trackEl()?.nativeElement;
    if (!track) return;

    const cardEls = track.querySelectorAll<HTMLElement>('.focus__card');
    const scrollLeft = track.scrollLeft;
    let closest = 0;
    let minDist = Infinity;

    cardEls.forEach((card, i) => {
      const dist = Math.abs(card.offsetLeft - track.offsetLeft - scrollLeft);
      if (dist < minDist) {
        minDist = dist;
        closest = i;
      }
    });

    this.setActive(closest);
  }

  // ── Helpers ────────────────────────────────────────────────────────

  private scrollNext(): void {
    const nextIdx = (this.activeIndex() + 1) % this.cards.length;
    this.goTo(nextIdx);
  }

  private setActive(index: number): void {
    if (this.activeIndex() !== index) {
      this.ngZone.run(() => this.activeIndex.set(index));
    }
  }
}
