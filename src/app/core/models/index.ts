// ============================================
// Core Models — SpaceLab
// ============================================

// ---- Post ----
export type PostStatus = 'draft' | 'published' | 'archived';
export type CoverType = 'image' | 'gif' | 'video' | 'none';
export type LanguageCode = 'zh-CN' | 'en-US';

export interface Post {
  id: string;
  slug: string;
  title: string;
  summary?: string;
  content: string;
  coverUrl?: string;
  coverType: CoverType;
  category?: string;
  tags: string[];
  status: PostStatus;
  language: LanguageCode;
  readingTime: number;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

// ---- Media ----
export type MediaType = 'image' | 'gif' | 'video' | 'model' | 'lottie' | 'rive';

export interface MediaAsset {
  id: string;
  type: MediaType;
  url: string;
  storagePath: string;
  title?: string;
  alt?: string;
  size: number;
  mimeType: string;
  width?: number;
  height?: number;
  duration?: number;
  createdAt: string;
}

// ---- Analytics ----
export type AnalyticsEventType =
  | 'page_view'
  | 'article_view'
  | 'project_view'
  | 'media_play'
  | 'button_click'
  | 'demo_open'
  | 'contact_click';

export interface AnalyticsEvent {
  id: string;
  eventType: AnalyticsEventType;
  pagePath?: string;
  pageTitle?: string;
  targetId?: string;
  targetType?: string;
  referrer?: string;
  deviceType?: string;
  browser?: string;
  language?: string;
  createdAt: string;
}

// ---- Project ----
export interface Project {
  id: string;
  slug: string;
  name: string;
  description: string;
  techTags: string[];
  status: string;
  coverUrl?: string;
  coverType: CoverType;
  githubUrl?: string;
  liveUrl?: string;
  images: string[];
  videoUrl?: string;
  features: string[];
  highlights: string[];
  createdAt: string;
  updatedAt: string;
}

// ---- Gallery ----
export type GalleryItemType = 'image' | 'gif' | 'video' | 'model' | 'ui-motion' | 'screenshot';

export interface GalleryItem {
  id: string;
  type: GalleryItemType;
  url: string;
  title?: string;
  caption?: string;
  tags: string[];
  createdAt: string;
}

// ---- Site Pulse (首页概览) ----
export interface SitePulse {
  totalVisits: number;
  todayVisits: number;
  topPages: { path: string; title: string; views: number }[];
  topArticles: { slug: string; title: string; views: number }[];
  trend: { date: string; views: number }[];
}
