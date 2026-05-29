import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import type { GeneratedProject } from '../../../../generated/content.generated';

@Component({
  selector: 'app-project-card',
  template: `
    <article class="project-card" [class.project-card--featured]="project.featured">
      <div class="project-card__content">
        <!-- Meta Row -->
        <div class="project-card__meta">
          @if (project.featured) {
            <span class="project-card__badge">{{ featuredLabel }}</span>
          }
          @if (project.stars > 0) {
            <span class="project-card__stars">★ {{ project.stars }}</span>
          }
          @if (project.language) {
            <span class="project-card__lang">{{ project.language }}</span>
          }
          @if (project.status === 'Archived') {
            <span class="project-card__status project-card__status--archived">Archived</span>
          }
          @if (project.fork) {
            <span class="project-card__status project-card__status--fork">Fork</span>
          }
        </div>

        <!-- Title -->
        <h2 class="project-card__title">{{ project.name }}</h2>

        <!-- Description -->
        @if (project.description) {
          <p class="project-card__description">{{ project.description }}</p>
        }

        <!-- Tags -->
        @if (project.tags.length > 0) {
          <div class="project-card__tags">
            @for (tag of project.tags; track tag) {
              <span class="project-card__tag">{{ tag }}</span>
            }
          </div>
        }

        <!-- Footer -->
        <div class="project-card__footer">
          <div class="project-card__actions">
            @if (project.github) {
              <a class="project-card__link" [href]="project.github" target="_blank" rel="noopener">
                GitHub →
              </a>
            }
            @if (project.demo) {
              <a
                class="project-card__link project-card__link--demo"
                [href]="project.demo"
                target="_blank"
                rel="noopener"
              >
                {{ demoLabel }}
              </a>
            }
          </div>
          @if (project.updatedAt) {
            <span class="project-card__date">{{ formatDateFn(project.updatedAt) }}</span>
          }
        </div>
      </div>

      <!-- Visual placeholder for featured projects -->
      @if (project.featured && project.cover) {
        <div class="project-card__visual">
          <img [src]="project.cover" [alt]="project.name" loading="lazy" />
        </div>
      }
    </article>
  `,
  styles: [
    `
      .project-card {
        position: relative;
        isolation: isolate;
        display: flex;
        gap: 28px;
        align-items: center;
        padding: 30px;
        border-radius: var(--radius-xl);
        background:
          linear-gradient(
            148deg,
            rgba(255, 255, 255, 0.22) 0%,
            rgba(255, 255, 255, 0.1) 48%,
            rgba(255, 255, 255, 0.05) 100%
          ),
          rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.46);
        box-shadow:
          0 14px 34px rgba(23, 23, 23, 0.06),
          inset 0 1px 0 rgba(255, 255, 255, 0.62),
          inset 0 -1px 0 rgba(255, 255, 255, 0.12);
        backdrop-filter: blur(14px) saturate(1.2);
        -webkit-backdrop-filter: blur(14px) saturate(1.2);
        overflow: hidden;
        transition:
          transform 180ms var(--ease-out),
          box-shadow 180ms var(--ease-out),
          border-color 180ms var(--ease-out);
      }

      .project-card::before {
        content: '';
        position: absolute;
        inset: 0;
        pointer-events: none;
        background:
          radial-gradient(circle at 18% 12%, rgba(255, 255, 255, 0.62), transparent 24%),
          linear-gradient(135deg, rgba(255, 255, 255, 0.18), transparent 42%);
        opacity: 0.88;
      }

      .project-card::after {
        content: '';
        position: absolute;
        inset: auto -8% -24% 38%;
        height: 50%;
        border-radius: 50%;
        pointer-events: none;
        background: radial-gradient(
          circle,
          rgba(255, 204, 51, 0.1) 0%,
          rgba(255, 255, 255, 0.03) 54%,
          transparent 100%
        );
        filter: blur(18px);
        opacity: 0.56;
        transform: rotate(-10deg);
      }

      .project-card:hover {
        transform: translateY(-3px);
        border-color: rgba(255, 255, 255, 0.58);
        box-shadow:
          0 18px 40px rgba(23, 23, 23, 0.08),
          inset 0 1px 0 rgba(255, 255, 255, 0.72),
          inset 0 -1px 0 rgba(255, 255, 255, 0.12);
      }

      /* ── Content ─────────────────────────────── */

      .project-card__content {
        flex: 1;
        min-width: 0;
        position: relative;
        z-index: 1;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .project-card__meta {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }

      .project-card__badge {
        display: inline-flex;
        align-items: center;
        height: 22px;
        padding: 0 10px;
        border-radius: 999px;
        background: rgba(255, 210, 31, 0.22);
        border: 1px solid rgba(255, 210, 31, 0.36);
        color: #8b6914;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        backdrop-filter: blur(12px) saturate(130%);
        -webkit-backdrop-filter: blur(12px) saturate(130%);
      }

      .project-card__stars {
        font-size: 12px;
        font-weight: 700;
        color: var(--color-text-secondary);
        letter-spacing: 0.02em;
      }

      .project-card__lang {
        font-size: 12px;
        font-weight: 600;
        color: var(--color-text-tertiary);
        padding: 2px 8px;
        border-radius: 999px;
        background: rgba(0, 0, 0, 0.05);
      }

      .project-card__status {
        font-size: 11px;
        font-weight: 700;
        padding: 2px 8px;
        border-radius: 999px;
        letter-spacing: 0.02em;
      }

      .project-card__status--archived {
        background: rgba(0, 0, 0, 0.06);
        color: var(--color-text-tertiary);
      }

      .project-card__status--fork {
        background: rgba(143, 124, 255, 0.12);
        color: #6b5ce7;
      }

      .project-card__title {
        font-size: clamp(1.2rem, 2.5vw, 1.5rem);
        font-weight: 800;
        color: var(--color-text);
        letter-spacing: -0.02em;
        line-height: 1.2;
      }

      .project-card__description {
        font-size: 0.95rem;
        color: var(--color-text-secondary);
        line-height: 1.65;
      }

      .project-card__tags {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }

      .project-card__tag {
        font-size: 0.72rem;
        font-weight: 600;
        color: var(--color-text-tertiary);
        background: rgba(0, 0, 0, 0.04);
        padding: 3px 10px;
        border-radius: 999px;
        letter-spacing: 0.02em;
      }

      .project-card__footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        flex-wrap: wrap;
        margin-top: 4px;
      }

      .project-card__actions {
        display: flex;
        gap: 16px;
        align-items: center;
      }

      .project-card__link {
        font-size: 0.85rem;
        font-weight: 700;
        color: var(--color-google-blue);
        text-decoration: none;
        transition: opacity 180ms var(--ease-out);

        &:hover {
          opacity: 0.72;
        }
      }

      .project-card__link--demo {
        color: var(--color-text-secondary);
      }

      .project-card__date {
        font-size: 0.75rem;
        color: var(--color-text-tertiary);
        font-family: var(--font-mono);
      }

      /* ── Visual (featured only) ──────────────── */

      .project-card__visual {
        flex-shrink: 0;
        width: 260px;
        height: 180px;
        border-radius: var(--radius-lg);
        overflow: hidden;
        position: relative;
        z-index: 1;
        background: rgba(0, 0, 0, 0.04);
      }

      .project-card__visual img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      /* ── Featured: slightly larger ───────────── */

      .project-card--featured {
        padding: 36px;
        gap: 36px;
      }

      .project-card--featured .project-card__title {
        font-size: clamp(1.4rem, 3vw, 1.75rem);
      }

      .project-card--featured .project-card__description {
        font-size: 1rem;
      }

      /* ── Mobile ──────────────────────────────── */

      @media (max-width: 767px) {
        .project-card {
          flex-direction: column;
          padding: 20px;
          border-radius: 22px;
          gap: 20px;
        }

        .project-card--featured {
          padding: 20px;
          gap: 20px;
        }

        .project-card__visual {
          width: 100%;
          min-height: 160px;
          order: -1;
        }

        .project-card__footer {
          flex-direction: column;
          align-items: flex-start;
        }

        .project-card__actions {
          gap: 12px;
        }

        .project-card__link {
          min-height: 44px;
          display: inline-flex;
          align-items: center;
        }
      }

      /* ── Reduced Motion ──────────────────────── */

      @media (prefers-reduced-motion: reduce) {
        .project-card {
          transition: none;
        }
        .project-card:hover {
          transform: none;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectCardComponent {
  @Input({ required: true }) project!: GeneratedProject;
  @Input() featuredLabel = '精选';
  @Input() demoLabel = '在线预览';
  @Input() formatDate: (iso: string) => string = () => '';

  formatDateFn(iso: string): string {
    return this.formatDate(iso);
  }
}
