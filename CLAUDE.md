# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**newmaybe** is a Chinese-language personal brand site and digital garden built as an **npm Monorepo** with 6 sub-applications deployed to Cloudflare Pages. The main site is a minimalist editorial blog; the subdomains extend it with a knowledge graph, AI assistant, interactive experiments, creative tools, and a writing studio.

- **Architecture**: npm Workspaces Monorepo
- **Main framework**: Astro 7 (SSG, Node 22.12+ required)
- **Sub-app stacks**: React 19 + Vite (tools / ai / studio), Astro 7 + D3 (graph), Astro 7 + Canvas (lab)
- **Hosting**: Cloudflare Pages (6 independent projects, one per sub-app)
- **Domains**: `newmaybe.com` + 5 subdomains

## Monorepo Structure

```
newmaybe/
├── apps/
│   ├── main/        # newmaybe.com       — Astro 7, pure SSG, Vanilla CSS
│   ├── graph/       # graph.newmaybe.com — Astro 7, D3.js force graph
│   ├── tools/       # tools.newmaybe.com — React 19, Tailwind v4, Vite
│   ├── ai/          # ai.newmaybe.com    — React 19, Vite, RAG + Workers AI
│   ├── lab/         # lab.newmaybe.com   — Astro 7, Canvas/WebGL experiments
│   └── studio/      # studio.newmaybe.com — React 19, Tailwind v4, Vite
├── packages/
│   ├── content/         # Shared content database (all Markdown + Zod schemas)
│   └── shared-styles/   # Single source of truth for CSS design tokens
└── scripts/
    ├── new.ts           # Content creation CLI  (npm run new)
    └── audit-posts.ts   # Post quality auditor  (npm run audit)
```

## Core Commands (run from repo root)

```bash
npm install              # Install all workspace dependencies

# Dev servers
npm run dev:main         # http://localhost:4321
npm run dev:graph        # http://localhost:4322
npm run dev:tools        # http://localhost:4323
npm run dev:ai           # http://localhost:4324
npm run dev:lab          # http://localhost:4325
npm run dev:studio       # http://localhost:4326

# Builds
npm run build:main       # Astro build + pagefind index
npm run build:graph
npm run build:tools
npm run build:ai
npm run build:lab
npm run build:studio

# Content workflow
npm run new fragment     # Create a fragment (zero-interaction)
npm run new note         # Create a note (interactive: title/slug/stage)
npm run new post         # Create a post (interactive: title/slug/desc/category)
npm run new excerpt      # Create an excerpt (zero-interaction)
npm run audit            # Audit post quality (readingTime, description, structure)
```

## Shared Packages

### `@newmaybe/content`

Content database and utilities consumed by all sub-apps.

**Collections** (all Markdown, glob-loaded by Astro Content Layer API):

| Collection | Path | Key Fields |
|---|---|---|
| `posts` | `packages/content/posts/` | title, description, pubDate, category, readingTime, weight, draft, watermark, connections |
| `fragments` | `packages/content/fragments/` | pubDate, mood?, location?, draft, connections |
| `excerpts` | `packages/content/excerpts/` | author, source?, pubDate, tags, comment?, draft, connections |
| `notes` | `packages/content/notes/` | title, pubDate, stage (sprout/bud/evergreen), tags, connections, draft |
| `memories` | `packages/content/memories/` | title, pubDate, category, connections, version, draft |

**`connections` field** (all collections): `string[]` in format `"collection/slug"` — e.g., `["notes/my-note", "posts/some-post"]`. Resolved at build time by `resolveConnections()`.

**`packages/content/src/schemas.ts`**: Zod schemas for all collections.
**`packages/content/src/utils.ts`**: `resolveSubdomain(url, isDev)` — maps production subdomain URLs to localhost ports in dev mode.

### `@newmaybe/shared-styles`

**`packages/shared-styles/tokens.css`**: Single source of truth for all CSS design tokens. All 6 sub-apps import this file. Do not hardcode token values anywhere else.

```css
/* Key tokens */
--paper, --paper-deep          /* backgrounds */
--ink, --ink-soft, --ink-faint /* text hierarchy */
--ochre, --ochre-deep          /* accent */
--line                         /* borders/dividers */
--watermark-opacity            /* poetry watermark */
--serif-cn, --serif-en         /* font families */
/* + @media (prefers-color-scheme: dark), :root.dark, :root.light variants */
```

**OG image colors** use `apps/main/src/lib/og-tokens.ts` (JS constants, because satori cannot read CSS variables).

---

## apps/main — Main Site

### Directory Layout

```
apps/main/src/
├── config.ts              # SITE metadata, NAV array, resolveSubdomain()
├── content.config.ts      # Astro Content Layer: 5 collections → packages/content
├── styles/global.css      # @import tokens.css + layout vars + global typography
├── layouts/
│   └── Base.astro         # <head>, fixed header, mobile drawer, footer, theme script
├── components/
│   ├── Hero.astro         # Homepage hero with staggered word animations
│   ├── PostList.astro     # Reusable post list (date, title, description, category)
│   ├── QuoteBand.astro    # Full-width editorial quote band
│   ├── HomeFragment.astro # Latest fragment displayed on homepage
│   ├── HomeExcerpt.astro  # Latest excerpt displayed on homepage
│   ├── Search.astro       # Pagefind full-text search UI
│   └── WorkCardInner.astro # Work item card content
├── lib/
│   ├── posts.ts           # sortPostsForDisplay(): weight DESC → pubDate DESC
│   ├── connections.ts     # resolveConnections(), connUrl(), connTitle(), COLL_LABEL, ResolvedConnection type
│   └── og-tokens.ts       # OG_COLORS constant (mirrors tokens.css for satori)
└── pages/
    ├── index.astro            # Homepage: recent posts + latest fragment + latest excerpt + QuoteBand
    ├── writing/
    │   ├── index.astro        # Full writing archive (sorted by weight then date)
    │   └── [slug].astro       # Post detail: reading bar, poetry layout, connections/related reading
    ├── garden.astro           # Digital garden: notes (by stage) + memories (URL-persisted tabs)
    ├── fragments.astro        # Fragment timeline
    ├── excerpts.astro         # Excerpts collection
    ├── notes/
    │   ├── index.astro        # Notes list
    │   └── [slug].astro       # Note detail
    ├── memory/
    │   ├── index.astro        # Memories list
    │   └── [slug].astro       # Memory detail
    ├── about.astro
    ├── work.astro             # Projects + subdomain entry points
    ├── og/[slug].png.ts       # Build-time OG images (satori + sharp, 1200×630)
    ├── rss.xml.js             # RSS feed (posts only, chronological)
    ├── all-content.json.ts    # JSON endpoint consumed by ai subdomain for RAG
    └── search.astro           # Pagefind search page (generated after build)
```

### Key Architectural Patterns

**Content Layer API**: Uses Astro 7's `glob` loader (not legacy `type: 'content'`). Collections are defined in `content.config.ts` pointing at `../../packages/content/*`.

**Sorting**: `sortPostsForDisplay()` sorts by `weight DESC` then `pubDate DESC`. RSS stays `pubDate DESC`. Always use this function for display lists, not getCollection directly.

**Draft filtering**: `getCollection('posts', ({ data }) => !data.draft)`. Apply this filter for every public-facing page.

**connections system** (`lib/connections.ts`):
- `resolveConnections(strings[])` — resolves `"collection/slug"` strings to typed `CollectionEntry` objects via parallel `getEntry()` calls
- `ResolvedConnection` — discriminated union of `CollectionEntry` for all 5 collections; no `any` types
- `connUrl(conn)`, `connTitle(conn)`, `COLL_LABEL` — helpers for rendering links; always import from lib, never redefine in pages

**View Transitions**: Enabled globally. All scripts that attach DOM event listeners use `astro:page-load` to re-bind after navigation and `astro:before-swap` for pre-swap cleanup. The theme class sync uses `astro:before-swap` to eliminate dark-mode flash.

**Theme system**: `dark` / `light` class on `<html>`. Stored in cookie (not localStorage) so the server can read it pre-render. No theme flash on load.

**Styling rules**:
- Main site: pure Vanilla CSS, no framework. All tokens via CSS custom properties.
- React sub-apps: Tailwind v4 + `@import '@newmaybe/shared-styles/tokens.css'` in `index.css`.
- Never hardcode color hex values in component files — always use token variables.
- Responsive breakpoint: 680px.

**Poetry layout** (`writing/[slug].astro`): Posts with `category: 诗歌` get a special layout with centered lines. Optional `watermark` field renders a single character as a faint full-page watermark (CSS animation). A toggle switches between horizontal and `writing-mode: vertical-rl` (竖排) with `scroll-snap`, persisted to localStorage.

**OG images**: Generated at build time in `og/[slug].png.ts` using satori (SVG) + sharp (PNG). Colors come from `lib/og-tokens.ts`. Fonts loaded lazily and cached at module level.

**Pagefind**: Runs after `astro build` (`build` script: `astro build && pagefind --site dist`). Adds full-text Chinese search. The `Search.astro` component and `search.astro` page provide the UI.

**SEO**: `Base.astro` generates canonical URLs, OG tags, Twitter cards, and RSS auto-discovery. Pass `image` prop for per-post OG image, `article={true}` for og:type=article.

### Adding Content

Use the CLI — never create files manually:
```bash
npm run new post      # interactive prompts → creates draft in packages/content/posts/
npm run new fragment  # auto-date slug → opens in $EDITOR
npm run new note      # interactive (title, slug, stage)
npm run new excerpt   # auto-date slug → opens in $EDITOR
```

Frontmatter reference for posts:
```yaml
---
title: 标题
description: 一句话简介（10–80字）
pubDate: 2026-06-01
category: 随笔       # 随笔 | 诗歌 | 散文 | 观察 | 故事 | 小说
readingTime: 8       # minutes; audit checks ±30% accuracy
weight: 0            # higher = appears first in lists
draft: true          # set false when ready to publish
watermark: 雨        # optional, poetry only: one character watermark
connections:         # optional cross-collection links
  - notes/some-slug
  - posts/other-slug
---
```

### Customizing Colors

Edit `packages/shared-styles/tokens.css` `:root` block. Changes propagate to all 6 sub-apps automatically. Also update `apps/main/src/lib/og-tokens.ts` to match (OG images cannot use CSS variables).

### Navigation & Site Structure

Edit `apps/main/src/config.ts`:
- `SITE` object: title, tagline, author, URL, email
- `NAV` array: header navigation items

---

## Sub-application Notes

### `apps/graph` — Knowledge Graph
Astro 7 SSG. Fetches `all-content.json` from the main site at build time to build the D3 force-directed graph. Uses View Transitions. Shares token CSS.

### `apps/tools` — Writing Tools
React 19 + Vite. Two tabs: text formatter (Chinese/English mixed typography) and card exporter (fragment/excerpt share cards). Reads no live content at runtime.

### `apps/ai` — AI Garden Assistant
React 19 + Vite. RAG system: fetches `all-content.json` from main site, builds semantic index, answers questions with source citations. Free tier uses Cloudflare Workers AI (via Pages Function). Supports BYO API key for OpenAI/Gemini/DeepSeek/etc. — stored in localStorage, requests go directly to provider, no server relay.

### `apps/lab` — Interactive Experiments
Astro 7 SSG. Five experiments: audio-zen (Web Audio API white noise), floating-verse (Canvas particle poems), ink-flow (ink simulation), zen-writer (distraction-free writing space), index with card grid. Each is a standalone page.

### `apps/studio` — Creative Studio
React 19 + Vite. Three tabs: poster generator (HTML5 Canvas, multiple themes), inspiration engine (writing prompts), asset gallery (brand assets).

---

## Common Pitfalls

- **Astro content paths**: Content files live in `packages/content/`, not `apps/main/src/content/`. The `content.config.ts` uses `base: '../../packages/content/posts'`.
- **YAML null in templates**: Fields like `mood:` with no value become YAML null, which Zod `.optional()` rejects (it only accepts `undefined`). The `npm run new` CLI generates correct templates.
- **connections `any`**: Never use `as any` in the connections layer. Use `ResolvedConnection` type and import helpers from `lib/connections.ts`.
- **OG colors**: Do not hardcode hex in `og/[slug].png.ts`. Import from `lib/og-tokens.ts`.
- **Sub-app token imports**: React apps import tokens as `@import '@newmaybe/shared-styles/tokens.css'` at the top of `index.css`, before Tailwind. Do not redeclare `:root` variables.
- **Date consistency in scripts**: Use local time for both `isoDate` and `dateSlug` — `toISOString()` returns UTC and can be a different date around midnight.
