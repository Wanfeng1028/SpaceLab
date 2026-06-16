export const environment = {
  production: true,

  // 生产环境通过反向代理访问后端 API（nginx/apache 将 /api/* 转发到后端）
  apiUrl: '/api/v1',

  // LiveComment 站点 ID（如需 livecomment 集成，在此填写）
  liveCommentSiteId: '',

  // 应用版本
  appVersion: '1.0.0',

  // 站点 URL（用于 SEO canonical / sitemap / OpenGraph）
  siteUrl: 'https://wanfeng1028.github.io/SpaceLab',
  siteName: 'SpaceLab',

  // 调试模式
  debug: false,
};
