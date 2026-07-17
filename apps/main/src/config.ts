import { resolveSubdomain as _resolve } from '@newmaybe/content/utils';

export const SITE = {
  title: 'newmaybe',
  tagline: '留白 · 新可能',
  description: 'newmaybe —— 把生活留出空白，那些尚未成形的念头，才有机会长成新的可能。',
  url: 'https://newmaybe.com',
  author: 'newmaybe',
  email: 'lin@newmaybe.com',
  locale: 'zh-CN',
  startYear: 2026,
};

export const NAV = [
  { label: '文字', href: '/writing' },
  { label: '念头', href: '/fragments' },
  { label: '花园', href: '/garden' },
  { label: '拾遗', href: '/excerpts' },
  { label: '关于', href: '/about' },
];

export function resolveSubdomain(url: string): string {
  return _resolve(url, import.meta.env.DEV);
}
