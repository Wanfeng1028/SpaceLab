declare module '*.png' {
  const content: string;
  export default content;
}

declare module '*.jpg' {
  const content: string;
  export default content;
}

declare module '*.svg' {
  const content: string;
  export default content;
}

declare module '*.glsl' {
  const content: string;
  export default content;
}

// Cloudflare Turnstile
interface Window {
  turnstile: Turnstile;
}

interface Turnstile {
  render: (container: string | HTMLElement, options: TurnstileOptions) => string | undefined;
  reset: (widgetId?: string) => void;
  getResponse: (widgetId?: string) => string;
}

interface TurnstileOptions {
  sitekey: string;
  theme?: 'light' | 'dark' | 'auto';
  size?: 'normal' | 'compact';
  callback?: (token: string) => void;
  'expired-callback'?: () => void;
  'error-callback'?: () => void;
}

declare var turnstile: Turnstile;
