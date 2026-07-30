export const environment = {
  production: true,

  // Vercel 环境 API 地址（部署时替换为实际的 CF Worker 域名）
  apiUrl: 'https://your-cf-worker.workers.dev/api/v1',

  // LiveComment 站点 ID（如需 livecomment 集成，在此填写）
  liveCommentSiteId: '',

  // Cloudflare Turnstile v3 Site Key（需在 Cloudflare Dashboard 申请）
  turnstileSiteKey: '',

  // 应用版本
  appVersion: '1.0.0',

  // 站点 URL（部署时替换为实际域名）
  siteUrl: 'https://yourdomain.com',
  siteName: 'SpaceLab',

  // 调试模式
  debug: false,
};
