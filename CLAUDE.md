# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**newmaybe** is a minimalist personal brand/blog site built with **Astro 6** (static site generation) and deployed to **Cloudflare Pages**. It's an editorial-style Chinese-language site featuring a writing collection with a deliberately slow, anti-tracking design philosophy.

- **Type**: Static Site Generator (SSG)
- **Framework**: Astro 6 (Node 22.12+ required)
- **Language**: TypeScript + Astro components
- **Hosting**: Cloudflare Pages
- **Domain**: https://newmaybe.com

## Core Commands

```bash
npm install              # Install dependencies
npm run dev             # Start dev server (http://localhost:4321)
npm run build           # Build static site to dist/
npm run preview         # Preview production build locally
npm run astro           # Run astro CLI directly
```

## Project Structure

### Source Files (`src/`)

- **`config.ts`**: Centralized site metadata (title, tagline, author, nav items, URLs). Edit here to change site title, author info, navigation menu, and locale settings.

- **`content.config.ts`**: Content Layer API schema for blog posts. Defines the markdown frontmatter schema with fields: `title`, `description`, `pubDate`, `category`, `readingTime`, `draft`.

- **`content/posts/`**: Where blog post `.md` files live. Filenames become URL slugs. Draft posts (`draft: true`) are excluded from listings and RSS.

- **`layouts/Base.astro`**: Global layout providing `<head>` (SEO/OG tags), fixed header with navigation, and footer with links. Embeds scroll-triggered animations and header scroll detection.

- **`components/`**:
  - `Hero.astro`: Landing section with animated intro text and tagline. Uses staggered word-level animations.
  - `PostList.astro`: Reusable component rendering a list of posts with date, title, description, category, and reading time.
  - `QuoteBand.astro`: Full-width quote display section.

- **`pages/`**: Astro file-based routing:
  - `index.astro`: Homepage showing 3 most recent posts.
  - `writing/index.astro`: Full writing archive.
  - `writing/[slug].astro`: Individual post detail page with full prose typography.
  - `about.astro`, `contact.astro`, `work.astro`: Static pages.
  - `rss.xml.js`: RSS feed generation.

- **`styles/global.css`**: All color variables in `:root`, global typography setup, font-face declarations. Editorial color palette: `--paper` (cream), `--ink` (dark), `--ochre` (accent), plus typography families (`--serif-cn`, `--serif-en`).

### Public Files (`public/`)

- `fonts/`: Unused (fonts are self-hosted via Fontsource npm packages, bundled by Vite at build time).
- `_headers`: Cloudflare caching headers for fonts and `_astro/*` assets.
- `favicon.svg`, `og-default.png`: Brand assets.

## Key Architecture Patterns

### Content Management
- Posts are markdown files in `src/content/posts/` with frontmatter metadata.
- Uses Astro 6's **Content Layer API** with `glob` loader (replaces older `type: 'content'`).
- Draft filtering: `getCollection('posts', ({ data }) => !data.draft)` to exclude draft posts.
- Posts are sorted by `pubDate` descending (newest first).

### Styling Approach
- **No CSS frameworks**: All custom CSS. Editorial/minimalist aesthetic.
- **Design tokens**: Color variables centralized in `global.css` `:root`. Single accent color (`--ochre`) for subtle highlights.
- **Typography**: Two font families—Chinese (Noto Serif SC), English (Cormorant Garamond). Fallback to system serifs.
- **Responsive breakpoint**: 680px (mobile nav hidden, grid layouts collapse to 1 column).
- **Animations**: Intersection Observer-based scroll-in effects (`.reveal` class) and staggered intro animations in Hero.

### SEO & OG Tags
- Base layout accepts `title`, `description`, `image` (OG image), and `article` (boolean for og:type).
- Canonical URLs, locale metadata, Twitter cards all generated in `<head>`.
- RSS feed auto-discovery link included.

### Deployment
- Output: `dist/` directory (Astro default).
- Cloudflare Pages configuration:
  - Framework preset: Astro
  - Build command: `npm run build`
  - Output directory: `dist`
- Auto-deploys on git push.

## Configuration Files

- **`astro.config.mjs`**: Site URL, integrations (sitemap, RSS). No SSR adapter (pure SSG).
- **`tsconfig.json`**: Extends Astro strict config.
- **`package.json`**: Minimal dependencies—only `astro`, `@astrojs/rss`, `@astrojs/sitemap`.

## Development Notes

### Adding a New Post
1. Create `.md` file in `src/content/posts/` (filename = URL slug).
2. Add frontmatter:
   ```markdown
   ---
   title: Your Title
   description: One-sentence summary
   pubDate: 2026-06-01
   category: 随笔
   readingTime: 8
   draft: false
   ---
   ```
3. Write content in markdown.
4. Set `draft: true` to hide from listings/RSS until ready.

### Customizing Colors
Edit `:root` variables in `src/styles/global.css`:
- `--paper`: Background (cream)
- `--ink`: Text (dark)
- `--ochre`: Accent (warm brown)
- Plus `--ink-soft`, `--ink-faint`, `--line` for hierarchy.

All color usage flows from these variables—no hardcoded colors elsewhere.

### Navigation & Site Structure
Edit `src/config.ts` to:
- Change `SITE` object (title, tagline, author, URL, email).
- Modify `NAV` array to add/remove header and footer links.

Changes propagate to `Base.astro` layout automatically.

## Notes for Future Work

- **No client-side framework**: Astro does zero JS by default. JavaScript in Base.astro uses vanilla DOM APIs (scroll observer, intersection observer). Keep it minimal.
- **Markdown is the source of truth**: All post content lives as markdown. Astro renders at build time.
- **Astro 6 breaking change**: Content Layer API with `glob` loader (old `type: 'content'` removed). If upgrading, ensure loader usage in `content.config.ts`.
- **Static site constraints**: No dynamic data fetching at runtime. All content must be known at build time. RSS, sitemap, and post pages all pre-generated.

