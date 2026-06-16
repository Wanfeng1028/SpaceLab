// Angular Environment Configuration Template
// 复制此文件为 environment.ts 并修改配置

export const environment = {
  production: false,
  
  // 后端 API 地址
  apiUrl: 'http://localhost:8080/api/v1',
  
  // LiveComment 站点 ID（需要在 https://livecomment.cn 注册获取）
  liveCommentSiteId: 'your-livecomment-site-id',
  
  // Cloudflare Turnstile v3 Site Key（需在 https://www.google.com/recaptcha/admin 申请）
  turnstileSiteKey: '',
  
  // 应用版本
  appVersion: '1.0.0',
  
  // 调试模式
  debug: true,
  
  // 地图/3D 相关配置（可选）
  mapConfig: {
    accessToken: '',
    style: 'mapbox://styles/mapbox/dark-v10'
  }
};
