// ============================================
// API Constants — SpaceLab
// ============================================

export const API_ROUTES = {
  POSTS: '/api/posts',
  POST_BY_SLUG: (slug: string) => `/api/posts/${slug}`,
  PROJECTS: '/api/projects',
  PROJECT_BY_SLUG: (slug: string) => `/api/projects/${slug}`,
  MEDIA: '/api/media',
  ANALYTICS: '/api/analytics',
  GALLERY: '/api/gallery',
} as const;

export const STORAGE_PATHS = {
  POST_COVERS: 'media/posts/covers',
  POST_IMAGES: 'media/posts/images',
  POST_GIFS: 'media/posts/gifs',
  POST_VIDEOS: 'media/posts/videos',
  PROJECT_COVERS: 'media/projects/covers',
  PROJECT_VIDEOS: 'media/projects/videos',
  GALLERY: 'media/gallery',
  LAB_DEMOS: 'media/lab/demos',
} as const;

export const UPLOAD_LIMITS = {
  IMAGE_MAX_SIZE: 5 * 1024 * 1024,   // 5MB
  GIF_MAX_SIZE: 15 * 1024 * 1024,     // 15MB
  VIDEO_MAX_SIZE: 80 * 1024 * 1024,   // 80MB
  MODEL_MAX_SIZE: 30 * 1024 * 1024,   // 30MB
} as const;

export const ACCEPTED_FILE_TYPES = {
  IMAGE: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
  GIF: ['image/gif'],
  VIDEO: ['video/mp4', 'video/webm'],
  MODEL: ['model/gltf-binary', 'model/gltf+json'],
  LOTTIE: ['application/json'],
} as const;
