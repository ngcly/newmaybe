# newmaybe

文艺风格个人品牌站 · Astro 6 (SSG) + Cloudflare Pages

## 本地开发

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # 构建到 dist/
npm run preview    # 本地预览构建产物
```

需要 Node 22.12+(Astro 6 要求)。

## 目录结构

```
src/
  config.ts                 站点信息 / 导航(改这里）
  content.config.ts         文章集合 schema（Content Layer API）
  content/posts/*.md         ← 你的文章写在这里
  layouts/Base.astro         全局 <head>、SEO/OG、header、footer
  components/                Hero / PostList / QuoteBand
  pages/
    index.astro              首页（取最近 3 篇）
    writing/index.astro      全部文章列表
    writing/[slug].astro     文章详情
    rss.xml.js               RSS 输出
  styles/global.css          :root 配色变量 + 全局样式
public/
  _headers                   Cloudflare 缓存头
  favicon.svg
```

## 写新文章

在 `src/content/posts/` 新建 `.md`,文件名即 URL slug:

```markdown
---
title: 文章标题
description: 一句话摘要（用于列表与 SEO）
pubDate: 2026-06-01
category: 随笔
readingTime: 8
draft: false
---

正文……
```

`draft: true` 的文章不会出现在列表 / RSS / sitemap。

## 字体

Noto Serif SC 与 Cormorant Garamond 通过 Fontsource npm 包自托管（`@fontsource/noto-serif-sc`、`@fontsource/cormorant-garamond`）。Vite 构建时自动打包 woff2 到 `dist/_astro/`，无任何外部请求。中文字体已按简体字范围拆分，浏览器按需加载。

## 改配色

全部颜色集中在 `src/styles/global.css` 的 `:root`。改那几个变量即可全站换色。
