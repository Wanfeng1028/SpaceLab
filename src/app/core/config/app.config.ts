// ============================================
// App Configuration — SpaceLab
// ============================================

export const APP_CONFIG = {
  siteName: 'SpaceLab',
  siteDescription: 'SpaceLab — Personal Digital Space',
  defaultLanguage: 'zh-CN' as const,
  supportedLanguages: ['zh-CN', 'en-US'] as const,
  adminEmails: [] as string[], // populated from environment
};
