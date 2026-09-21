# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**newmaybe** is a Chinese-language personal brand site and digital garden built as an **npm Monorepo** with 7 sub-applications deployed to Cloudflare. The main site is a minimalist editorial blog; the subdomains extend it with a knowledge graph, AI assistant, interactive experiments, a creative studio, a classical reading app, and a writers club. The former tools app is retired; its capabilities live in Studio.

- **Architecture**: npm Workspaces Monorepo
- **Main framework**: Astro 7 (SSG, Node 22.12+ required)
- **Sub-app stacks**: React 19 + Vite (ai / studio / study / club), Astro 7 + D3 (graph), Astro 7 + Canvas (lab)
- **Hosting**: Cloudflare Pages for static apps; Workers + static assets for AI (see DEPLOY.md)
- **Domains**: `newmaybe.com` + 6 subdomains

## Monorepo Structure

```
newmaybe/
├── apps/
│   ├── main/        # newmaybe.com       — Astro 7, pure SSG, Vanilla CSS
│   ├── graph/       # graph.newmaybe.com — Astro 7, D3.js force graph
│   ├── ai/          # ai.newmaybe.com    — React 19, Vite, RAG + Workers AI
│   ├── lab/         # lab.newmaybe.com   — Astro 7, Canvas/WebGL experiments
│   ├── studio/      # studio.newmaybe.com — React 19, Tailwind v4, Vite, Creative studio (formatting, cards, posters, prompts, assets)
│   ├── study/       # study.newmaybe.com — React 19, Tailwind v4, Vite, Book library & reader
│   └── club/        # club.newmaybe.com  — React 19, Tailwind v4, Vite, Jianshu-style writing community
├── packages/
│   ├── content/         # Shared content database (all Markdown + Zod schemas)
│   ├── ai-client/       # Shared AI transport helpers
│   ├── design-tokens/   # Canonical TypeScript tokens + generated CSS
│   └── shared-styles/   # Shared styles and compatibility token import
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
npm run dev:ai           # http://localhost:4324
npm run dev:lab          # http://localhost:4325
npm run dev:studio       # http://localhost:4326
npm run dev:study        # http://localhost:4327
npm run dev:club         # http://localhost:4328

# Builds
npm run build:main       # Astro build + pagefind index
npm run build:graph
npm run build:ai
npm run build:lab
npm run build:studio
npm run build:study
npm run build:club

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

**`packages/design-tokens/src/index.ts`**: Single source of truth for CSS and TypeScript tokens. Run `npm run tokens:build` after edits; `npm run tokens:check` detects drift. `packages/shared-styles/tokens.css` is a compatibility import. All 7 sub-apps import this file. Do not hardcode token values anywhere else.

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
│   ├── HomeEchoes.astro   # Paired diptych of latest fragment + excerpt on homepage
│   ├── HomeFragment.astro # Latest fragment displayed on homepage
│   ├── HomeExcerpt.astro  # Latest excerpt displayed on homepage
│   ├── SealStamp.astro    # Cinnabar seal stamp component (yang/yin, square/round)
│   ├── EcosystemBand.astro # Ecosystem extension subspaces card grid
│   ├── Search.astro       # Pagefind full-text search UI
│   └── WorkCardInner.astro # Work item card content
├── lib/
│   ├── posts.ts           # sortPostsForDisplay(): weight DESC → pubDate DESC
│   ├── connections.ts     # resolveConnections(), connUrl(), connTitle(), COLL_LABEL, ResolvedConnection type
│   └── og-tokens.ts       # OG_COLORS derived from design-tokens for satori
└── pages/
    ├── index.astro            # Homepage: recent posts + HomeEchoes (fragment & excerpt) + EcosystemBand
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

**Theme system**: `dark` / `light` class on `<html>`. Stored in a shared-domain cookie and read by an early inline script; the main site is static, with no per-request server render.

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

Edit `packages/design-tokens/src/index.ts` and run `npm run tokens:build`. CSS, Canvas and OG images share these values; do not manually edit generated CSS.

### Navigation & Site Structure

Edit `apps/main/src/config.ts`:
- `SITE` object: title, tagline, author, URL, email
- `NAV` array: header navigation items

---

## Sub-application Notes

### `apps/graph` — Knowledge Graph
Astro 7 SSG. Reads the shared content collections at build time to build the D3 force-directed graph. Uses View Transitions. Shares token CSS.

### `apps/ai` — AI Garden Assistant
React 19 + Vite. RAG system: fetches `all-content.json` from main site, ranks content using keyword matching, answers questions with source citations. Free tier uses Cloudflare Workers AI (via a Worker). Supports BYO API key for OpenAI/Gemini/DeepSeek/etc. — stored in localStorage, requests go directly to provider, no server relay.

### `apps/lab` — Interactive Experiments
Astro 7 SSG. Five experiments: audio-zen (Web Audio API white noise), floating-verse (Canvas particle poems), ink-flow (ink simulation), zen-writer (distraction-free writing space), index with card grid. Each is a standalone page.

### `apps/studio` — Creative Studio (创作工坊)
React 19 + Tailwind v4 + Vite. Unified creative workshop with 5 capabilities: poster generator (HTML5 Canvas), fragment/excerpt card exporter, Chinese/English text formatter, inspiration engine, and asset gallery.

### `apps/study` — Study (林下书房)
React 19 + Tailwind v4 + Vite. A writing studio book library & reader. Features reading progress tracking, interactive practice exercises, and classical poetry reading mode. Runs on port 4327.

### `apps/club` — Writers Club (文友雅集)
React 19 + Tailwind v4 + Vite. A Jianshu-style minimalist writing and reading community. Features topic collections (专题文集), reader feeds, immersive reading, author seal colophon, article liking, and reader commenting. Drafts and reading preferences stay in the browser; published articles and comments are stored in Cloudflare D1 and publicly readable. Write completion invalidates and refetches the feed and active article, so overlapping reads cannot hide unrelated cloud data. Runs on port 4328.

---

## Common Pitfalls

- **Astro content paths**: Content files live in `packages/content/`, not `apps/main/src/content/`. The `content.config.ts` uses `base: '../../packages/content/posts'`.
- **YAML null in templates**: Fields like `mood:` with no value become YAML null, which Zod `.optional()` rejects (it only accepts `undefined`). The `npm run new` CLI generates correct templates.
- **connections `any`**: Never use `as any` in the connections layer. Use `ResolvedConnection` type and import helpers from `lib/connections.ts`.
- **OG colors**: Do not hardcode hex in `og/[slug].png.ts`. Import from `lib/og-tokens.ts`.
- **Sub-app token imports**: React apps import tokens as `@import '@newmaybe/shared-styles/tokens.css'` at the top of `index.css`, before Tailwind. Do not redeclare `:root` variables.
- **Date consistency in scripts**: Use local time for both `isoDate` and `dateSlug` — `toISOString()` returns UTC and can be a different date around midnight.
