// 站点级别的配置，集中在一处方便修改。
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

// 导航项，header 与 footer 共用
export const NAV = [
  { label: '文字', href: '/writing' },
  { label: '念头', href: '/fragments' },
  { label: '花园', href: '/garden' },
  { label: '拾遗', href: '/excerpts' },
  { label: '作品', href: '/work' },
  { label: '关于', href: '/about' },
];

// 动态解析子域，在本地开发模式下映射到对应端口
export function resolveSubdomain(url: string): string {
  if (import.meta.env.DEV) {
    if (url.includes('graph.newmaybe.com')) return 'http://localhost:4322';
    if (url.includes('tools.newmaybe.com')) return 'http://localhost:4323';
    if (url.includes('ai.newmaybe.com')) return 'http://localhost:4324';
    if (url.includes('lab.newmaybe.com')) return 'http://localhost:4325';
    if (url.includes('studio.newmaybe.com')) return 'http://localhost:4326';
    if (url.includes('newmaybe.com')) return url.replace('https://newmaybe.com', 'http://localhost:4321');
  }
  return url;
}
