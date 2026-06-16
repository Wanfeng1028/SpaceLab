import { Injectable } from '@angular/core';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

/**
 * Service that renders Markdown to sanitized HTML using markdown-it and DOMPurify.
 * Handles GFM features (strikethrough, tables, task lists) and sanitizes output.
 */
@Injectable({ providedIn: 'root' })
export class MarkdownRendererService {
  private readonly renderer = new marked.Renderer();

  constructor() {
    marked.setOptions({
      gfm: true,
      breaks: true,
      renderer: this.renderer,
    });
  }

  /**
   * Render Markdown string to sanitized HTML.
   */
  async render(markdown: string): Promise<string> {
    const rawHtml = marked.parse(markdown, { async: false }) as string;
    const sanitized = DOMPurify.sanitize(rawHtml, {
      ADD_ATTR: ['target'],
      ALLOW_DATA_ATTR: false,
      ALLOWED_TAGS: [
        'p', 'br', 'strong', 'em', 'del', 'code', 'pre', 'blockquote',
        'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'hr', 'img', 'a', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
        'span', 'div', 'details', 'summary', 'mark',
      ],
      ALLOWED_ATTR: [
        'href', 'src', 'alt', 'title', 'class', 'id',
        'target', 'rel', 'colspan', 'rowspan', 'width', 'height',
      ],
      ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
    });
    return sanitized;
  }

  /**
   * Render Markdown asynchronously (supports async extensions).
   */
  async renderAsync(markdown: string): Promise<string> {
    const rawHtml = (await marked.parse(markdown, { async: true })) as string;
    const sanitized = DOMPurify.sanitize(rawHtml, {
      ADD_ATTR: ['target'],
      ALLOW_DATA_ATTR: false,
      ALLOWED_TAGS: [
        'p', 'br', 'strong', 'em', 'del', 'code', 'pre', 'blockquote',
        'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'hr', 'img', 'a', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
        'span', 'div', 'details', 'summary', 'mark',
      ],
      ALLOWED_ATTR: [
        'href', 'src', 'alt', 'title', 'class', 'id',
        'target', 'rel', 'colspan', 'rowspan', 'width', 'height',
      ],
      ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
    });
    return sanitized;
  }
}
