interface Env {
  // D1
  DB: D1Database;
  // KV
  TOKEN_BLACKLIST: KVNamespace;
  RATE_LIMIT: KVNamespace;
  CACHE: KVNamespace;
  // R2
  MEDIA_BUCKET: R2Bucket;
  // Secrets
  JWT_SECRET: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  GITHUB_TOKEN: string;
  RESEND_API_KEY: string;
  RESEND_FROM: string;
  TURNSTILE_SECRET_KEY: string;
  TURNSTILE_SITE_KEY: string;
  // Vars
  ENVIRONMENT: string;
  JWT_EXPIRATION: string;
  JWT_REFRESH_EXPIRATION: string;
  AUTH_MODE: string; // "full" | "oauth-only"
  ALLOWED_ORIGINS: string;
  SITE_URL: string;
  UNVERIFIED_USER_RETENTION_DAYS: string;
  R2_PUBLIC_URL?: string;
}
