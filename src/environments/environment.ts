export const environment = {
  production: false,
  
  // 后端 API 地址（开发环境通过 proxy 转发到 localhost:8081）
  apiUrl: '/api/v1',
  
  // LiveComment 站点 ID（需要在 https://livecomment.cn 注册获取）
  liveCommentSiteId: 'your-livecomment-site-id',
  
  // Cloudflare Turnstile v3 Site Key（需在 https://www.google.com/recaptcha/admin 申请）
  turnstileSiteKey: '',
  
  // 应用版本
  appVersion: '1.0.0',

  // 站点 URL
  siteUrl: 'http://localhost:4200',
  siteName: 'SpaceLab (Dev)',
  
  // 调试模式
  debug: true
};
