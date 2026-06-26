import { resolveSubdomain as _resolve } from '@newmaybe/content/utils';

export const SITE = {
  title: 'newmaybe',
  tagline: '留白',
  description: '留白。一个安放文字与正在生长的念头的角落，不必急着填满。',
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
  { label: '作品', href: '/work' },
  { label: '关于', href: '/about' },
];

export function resolveSubdomain(url: string): string {
  return _resolve(url, import.meta.env.DEV);
}
