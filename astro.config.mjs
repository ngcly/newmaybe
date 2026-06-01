import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

import cloudflare from '@astrojs/cloudflare';

// 纯静态站点 (SSG)，构建产物丢给 Cloudflare Pages 即可。
// 不需要 SSR，所以不引入 @astrojs/cloudflare adapter。
export default defineConfig({
  site: 'https://newmaybe.com',

  // Astro 默认输出到 dist/，正好作为 Cloudflare Pages 的输出目录
  integrations: [sitemap()],

  adapter: cloudflare()
});