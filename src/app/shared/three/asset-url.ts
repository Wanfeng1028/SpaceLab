/**
 * 解析静态资源 URL，兼容 GitHub Pages 子路径部署（base href = /SpaceLab/）。
 *
 * 站点部署在子路径下时，以 "/" 开头的绝对路径会被浏览器解析到域名根
 * （如 https://wanfeng1028.github.io/...）而 404。传入相对 public/ 的路径
 * （如 "three/globe-stream/image/sprite.png"），返回带 base href 前缀的完整
 * 路径，确保正确指向 https://wanfeng1028.github.io/SpaceLab/...。
 */
export function assetUrl(path: string): string {
  if (typeof document === 'undefined') {
    return path.startsWith('/') ? path : '/' + path;
  }
  const base = document.querySelector('base')?.getAttribute('href') ?? '/';
  const normalizedBase = base.endsWith('/') ? base : base + '/';
  return normalizedBase + path.replace(/^\/+/, '');
}
