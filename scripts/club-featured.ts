import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';
import { load as parseYaml } from 'js-yaml';
import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  currentIssue,
  publishedIssues,
  featuredHref,
  featuredAssetHref,
  featuredFontPath,
  type FeaturedCatalog,
  type FeaturedIssue,
} from '../apps/club/src/lib/featured';
import themeBootstrap from '../packages/design-tokens/src/theme-bootstrap';

const repository = fileURLToPath(new URL('../', import.meta.url));
const sourceDirectory = join(repository, 'apps/club/featured');
const origin = 'https://club.newmaybe.com';
const headSlot = '<!-- club:head -->';
const navSlot = '<!-- club:nav -->';
// Same families as the club SPA, in the weights the shared pages use. Sliced faces keep each
// page to the glyphs it renders.
const fontSources = [
  '@fontsource/noto-serif-sc/400.css',
  '@fontsource/noto-serif-sc/500.css',
  '@fontsource/cormorant-garamond/latin-400.css',
  '@fontsource/cormorant-garamond/latin-400-italic.css',
];
const fontPackages = createRequire(join(repository, 'packages/shared-styles/package.json'));

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!,
  );

function safeFile(path: string): boolean {
  return (
    !path.startsWith('/') &&
    path.split('/').every((part) => /^[a-zA-Z0-9_-][a-zA-Z0-9_.-]*$/.test(part))
  );
}

export function validateFeaturedCatalog(value: unknown): asserts value is FeaturedCatalog {
  if (!value || typeof value !== 'object') throw Error('精选目录必须是对象');
  const catalog = value as FeaturedCatalog;
  if (!Array.isArray(catalog.issues)) throw Error('精选目录缺少 issues 数组');
  const slugs = new Set<string>();
  for (const issue of catalog.issues) {
    if (
      !issue ||
      typeof issue.slug !== 'string' ||
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(issue.slug) ||
      ['archive', 'common'].includes(issue.slug)
    )
      throw Error('期号路径须为小写字母、数字与连字符，不能使用 archive/common');
    if (slugs.has(issue.slug)) throw Error(`重复的精选路径：${issue.slug}`);
    slugs.add(issue.slug);
    if (!['draft', 'published'].includes(issue.status)) throw Error(`${issue.slug}: 无效发布状态`);
    for (const key of ['number', 'title', 'author', 'description', 'articleRevision'] as const) {
      if (typeof issue[key] !== 'string' || !issue[key].trim())
        throw Error(`${issue.slug}: 缺少 ${key}`);
    }
    if (Boolean(issue.articleId) === Boolean(issue.sourcePost))
      throw Error(`${issue.slug}: 必须且只能选择 articleId 或 sourcePost`);
    if (
      issue.articleId !== undefined &&
      (typeof issue.articleId !== 'string' || !/^[a-zA-Z0-9-]+$/.test(issue.articleId))
    )
      throw Error(`${issue.slug}: 无效的社区原文 ID`);
    if (issue.sourcePost !== undefined) {
      if (typeof issue.sourcePost !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(issue.sourcePost))
        throw Error(`${issue.slug}: 无效的主站原文路径`);
      if (issue.status === 'published') {
        const source = readFileSync(
          join(repository, 'packages/content/posts', `${issue.sourcePost}.md`),
          'utf8',
        );
        const frontmatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
        const meta = frontmatter
          ? (parseYaml(frontmatter[1]) as { draft?: boolean; title?: string })
          : null;
        if (!meta || meta.draft !== false || meta.title !== issue.title)
          throw Error(`${issue.slug}: 主站原文必须已公开且标题一致`);
      }
    }
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(issue.publishedAt) ||
      !Number.isFinite(Date.parse(issue.publishedAt)) ||
      new Date(issue.publishedAt).toISOString().slice(0, 10) !== issue.publishedAt
    )
      throw Error(`${issue.slug}: publishedAt 必须是有效的 YYYY-MM-DD 日期`);
    if (issue.cover !== undefined && (typeof issue.cover !== 'string' || !safeFile(issue.cover)))
      throw Error(`${issue.slug}: 封面必须是期内相对资源路径`);
  }
  if (
    catalog.currentIssue !== null &&
    !catalog.issues.some(
      (issue) => issue.slug === catalog.currentIssue && issue.status === 'published',
    )
  )
    throw Error('currentIssue 必须为 null 或已发布期的 slug');
}

function metadata(title: string, description: string, path: string, cover?: string) {
  return `<meta name="club-featured" content="${escapeHtml(path)}">
<title>${escapeHtml(title)} · 一期一文 · 文友雅集</title>
<meta name="description" content="${escapeHtml(description)}">
<link rel="canonical" href="${origin}${path}">
<meta property="og:title" content="${escapeHtml(title)} · 一期一文">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:url" content="${origin}${path}">
<meta property="og:type" content="${path === '/featured' || path === '/featured/archive' ? 'website' : 'article'}">
<meta name="twitter:card" content="${cover ? 'summary_large_image' : 'summary'}">
${cover ? `<meta property="og:image" content="${origin}${escapeHtml(cover)}">` : ''}
<link rel="icon" href="/favicon.svg">
<link rel="stylesheet" href="/${featuredFonts().folder}/fonts.css">
<link rel="stylesheet" href="/featured/common/tokens.css">
<link rel="stylesheet" href="/featured/common/navigation.css">`;
}

function navigation(issue?: FeaturedIssue) {
  const source = issue?.sourcePost
    ? `https://newmaybe.com/writing/${encodeURIComponent(issue.sourcePost)}/`
    : `/articles/${encodeURIComponent(issue?.articleId || '')}`;
  return `<nav class="club-edition-nav" aria-label="精选导航">
<a href="/">← 文友雅集</a><span>一期一文${issue ? ` · ${escapeHtml(issue.number)}` : ''}</span>
<div>${issue ? `<a href="${source}">${issue.sourcePost ? '主站原文' : '原文与讨论'}</a>` : ''}<a href="/featured">本期</a><a href="/featured/archive">往期</a></div></nav>`;
}

export function renderFeaturedIssue(html: string, issue: FeaturedIssue): string {
  for (const slot of [headSlot, navSlot]) {
    if (html.split(slot).length !== 2) throw Error(`${issue.slug}: 必须且只能包含一个 ${slot}`);
  }
  if (!/<html[\s>]/i.test(html) || !/<head[\s>]/i.test(html) || !/<body[\s>]/i.test(html))
    throw Error(`${issue.slug}: 请交付完整 HTML 文档`);
  if (
    /<base\b|<title\b|<meta[^>]+(?:name|property)=["'](?:description|og:|twitter:)|<link[^>]+rel=["']canonical/i.test(
      html,
    )
  )
    throw Error(`${issue.slug}: 标题、分享信息、canonical 和 base 由框架生成，请移除重复声明`);
  return html
    .replace(
      headSlot,
      () =>
        `<base href="${featuredHref(issue.slug)}/">${metadata(issue.title, issue.description, featuredHref(issue.slug), issue.cover ? featuredAssetHref(issue.slug, issue.cover) : undefined)}`,
    )
    .replace(navSlot, () => navigation(issue));
}

function issueCard(issue: FeaturedIssue, current = false): string {
  return `<article class="edition-card${current ? ' edition-current' : ''}">
${issue.cover ? `<a href="${featuredHref(issue.slug)}" tabindex="-1" aria-hidden="true"><img class="edition-cover" src="${featuredAssetHref(issue.slug, issue.cover)}" alt="" loading="lazy"></a>` : ''}
<div class="edition-card-copy"><p class="edition-label">${current ? '本期精选 · ' : ''}第 ${escapeHtml(issue.number)} 期 <span> / ${escapeHtml(issue.publishedAt)}</span></p>
<h2><a href="${featuredHref(issue.slug)}">${escapeHtml(issue.title)}</a></h2>
<p class="edition-author">${escapeHtml(issue.author)}</p><p>${escapeHtml(issue.description)}</p>
<a class="edition-link" href="${featuredHref(issue.slug)}">进入这一期 <span aria-hidden="true">↗</span></a></div></article>`;
}

function renderIndex(catalog: FeaturedCatalog, archive: boolean): string {
  const current = currentIssue(catalog);
  const issues = publishedIssues(catalog);
  const path = archive ? '/featured/archive' : '/featured';
  const title = archive ? '往期精选' : '一期一文';
  const description =
    '每期一篇文字，一次独立的阅读体验。在文字、光影与声音之间，留一段完整的时光。';
  return `<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
${metadata(title, description, path)}<script>${themeBootstrap}</script><link rel="stylesheet" href="/featured/common/catalog.css"></head>
<body><a class="edition-skip" href="#content">跳到正文</a>${navigation()}
<main id="content" class="edition-main"><header class="edition-heading"><p class="edition-label">文友雅集 / 精选特刊</p>
<h1>${title}<span aria-hidden="true">。</span></h1><p>${archive ? '每一次停留，都在这里留下回声。' : description}</p></header>
${
  archive
    ? issues.length
      ? `<div class="edition-grid">${issues.map((issue) => issueCard(issue, issue.slug === catalog.currentIssue)).join('')}</div>`
      : '<section class="edition-empty"><h2>故事，还将继续。</h2><p>首期发布后，作品会在这里逐期珍藏。</p><a class="edition-link" href="/featured">回到本期精选 →</a></section>'
    : current
      ? issueCard(current, true)
      : '<section class="edition-empty"><span class="edition-number" aria-hidden="true">序</span><h2>为一篇好文章，<br>留一段完整的时光。</h2><p>首期正在筹备。下一次相逢，从一篇文字开始。</p><a class="edition-link" href="/">先去雅集读一读 →</a></section>'
}
<footer class="edition-footer"><span>字里相逢，行间留白。</span><a href="${archive ? '/featured' : '/featured/archive'}">${archive ? '本期精选' : '浏览往期'} →</a></footer></main></body></html>`;
}

let fonts: { folder: string; assets: [string, string | Uint8Array][] } | undefined;

/**
 * Self-hosted font faces for every edition document. The folder is named after the package
 * versions plus a hash of the stylesheet, so any change gets a new URL and it can be cached for good.
 */
function featuredFonts() {
  if (fonts) return fonts;
  const files = new Map<string, Uint8Array>();
  const css = fontSources
    .map((source) => {
      const path = fontPackages.resolve(source);
      const rewritten = readFileSync(path, 'utf8').replace(
        /url\(\.\/files\/([\w-]+\.woff2)\) format\('woff2'\)(?:, url\(\.\/files\/[\w-]+\.woff\) format\('woff'\))?/g,
        (_, file: string) => {
          files.set(file, readFileSync(join(dirname(path), 'files', file)));
          return `url(${file}) format('woff2')`;
        },
      );
      if (rewritten.includes('./files/')) throw Error(`无法解析字体文件：${source}`);
      return rewritten;
    })
    .join('\n');
  const versions = ['noto-serif-sc', 'cormorant-garamond'].map(
    (name) =>
      (
        JSON.parse(
          readFileSync(fontPackages.resolve(`@fontsource/${name}/package.json`), 'utf8'),
        ) as {
          version: string;
        }
      ).version,
  );
  const hash = createHash('sha256').update(css).digest('hex').slice(0, 8);
  const folder = `featured/common/fonts/${versions.join('-')}-${hash}`;
  const assets: [string, string | Uint8Array][] = [
    [`${folder}/fonts.css`, css],
    ...[...files].map(([file, data]): [string, Uint8Array] => [`${folder}/${file}`, data]),
  ];
  // The Worker only serves (and long-caches) paths of this shape; fail the build, not production.
  const unserved = assets.find(([name]) => !featuredFontPath.test(`/${name}`));
  if (unserved) throw Error(`字体路径不在精选公共资源范围内：${unserved[0]}`);
  return (fonts = { folder, assets });
}

export function buildFeaturedAssets(directory = sourceDirectory): Map<string, string | Uint8Array> {
  const catalog: unknown = JSON.parse(readFileSync(join(directory, 'catalog.json'), 'utf8'));
  validateFeaturedCatalog(catalog);
  const assets = new Map<string, string | Uint8Array>([
    ['featured.html', renderIndex(catalog, false)],
    ['featured/archive.html', renderIndex(catalog, true)],
    [
      'featured/common/tokens.css',
      readFileSync(join(repository, 'packages/design-tokens/tokens.css')),
    ],
    ...['catalog.css', 'navigation.css'].map((name): [string, Uint8Array] => [
      `featured/common/${name}`,
      readFileSync(join(sourceDirectory, name)),
    ]),
    ...featuredFonts().assets,
  ]);
  for (const issue of publishedIssues(catalog)) {
    const root = join(directory, 'issues', issue.slug);
    const html = readFileSync(join(root, 'index.html'), 'utf8');
    assets.set(`featured/${issue.slug}.html`, renderFeaturedIssue(html, issue));
    const copy = (folder: string) => {
      for (const entry of readdirSync(folder, { withFileTypes: true })) {
        const file = join(folder, entry.name);
        const name = relative(root, file).split('\\').join('/');
        if (name === 'index.html') continue;
        if (!safeFile(name) || entry.isSymbolicLink())
          throw Error(`${issue.slug}: 不支持资源路径 ${name}`);
        if (entry.isDirectory()) copy(file);
        else if (entry.isFile()) {
          if (
            !/\.(?:css|js|mjs|json|svg|png|jpe?g|gif|webp|avif|ico|mp3|m4a|ogg|wav|mp4|webm|woff2?|ttf|otf|vtt)$/i.test(
              name,
            )
          )
            throw Error(`${issue.slug}: 不支持的发布资源 ${name}，设计说明请放到目录外`);
          assets.set(`featured/${issue.slug}/${name}`, readFileSync(file));
        }
      }
    };
    copy(root);
    if (issue.cover && !assets.has(`featured/${issue.slug}/${issue.cover}`))
      throw Error(`${issue.slug}: 找不到封面文件`);
  }
  return assets;
}

const contentTypes: Record<string, string> = {
  html: 'text/html; charset=utf-8',
  css: 'text/css; charset=utf-8',
  js: 'text/javascript',
  mjs: 'text/javascript',
  json: 'application/json',
  svg: 'image/svg+xml',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  avif: 'image/avif',
  ico: 'image/x-icon',
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  ogg: 'audio/ogg',
  wav: 'audio/wav',
  mp4: 'video/mp4',
  webm: 'video/webm',
  woff: 'font/woff',
  woff2: 'font/woff2',
  ttf: 'font/ttf',
  otf: 'font/otf',
  vtt: 'text/vtt',
};

/** Local dev and preview use the same published documents as the production build. */
export function clubFeatured(): Plugin {
  let development = false;
  let generated: Map<string, string | Uint8Array> | undefined;
  let getAssets = () => (generated ??= buildFeaturedAssets());
  const middleware = (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const url = new URL(req.url || '/', 'http://localhost');
    const path = url.pathname;
    // This is Vite's source-module request, not an edition asset. Keep other source paths private.
    if (
      development &&
      path === '/featured/catalog.json' &&
      url.searchParams.has('import') &&
      [...url.searchParams.keys()].every((key) => ['import', 't', 'v'].includes(key))
    )
      return next();
    if (path !== '/featured' && !path.startsWith('/featured/')) return next();
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { Allow: 'GET, HEAD' }).end();
      return;
    }
    try {
      const assets = getAssets();
      const normalized = path.replace(/\/$/, '').replace(/\.html$/, '');
      const file = normalized.slice(1);
      const key = assets.has(`${file}.html`) ? `${file}.html` : file;
      const body = assets.get(key);
      if (body !== undefined && path !== normalized && key.endsWith('.html')) {
        res.writeHead(308, { Location: normalized }).end();
        return;
      }
      res.writeHead(body === undefined ? 404 : 200, {
        'Content-Type':
          body === undefined
            ? 'text/plain; charset=utf-8'
            : contentTypes[key.split('.').pop() || ''] || 'application/octet-stream',
        'Cache-Control': 'no-store',
      });
      res.end(
        req.method === 'HEAD'
          ? undefined
          : (body ?? '这一期尚未发布。返回 /featured 查看本期精选。'),
      );
    } catch (error) {
      nextError(res, error);
    }
  };
  return {
    name: 'club-featured',
    enforce: 'pre',
    transform(code, id) {
      if (id.split('?')[0] !== join(sourceDirectory, 'catalog.json')) return;
      const catalog: unknown = JSON.parse(code);
      validateFeaturedCatalog(catalog);
      // The homepage only needs published metadata; draft titles must not leak into its JS bundle.
      return { code: JSON.stringify({ ...catalog, issues: publishedIssues(catalog) }), map: null };
    },
    configureServer(server) {
      development = true;
      server.watcher.add(sourceDirectory);
      server.watcher.on('all', (_event, file) => {
        if (file.startsWith(sourceDirectory)) generated = undefined;
      });
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      // Preview the built release, not a newer draft/source tree.
      const output = join(server.config.root, server.config.build.outDir);
      const built = new Map<string, string | Uint8Array>();
      const read = (folder: string) => {
        for (const entry of readdirSync(folder, { withFileTypes: true })) {
          const path = join(folder, entry.name);
          if (entry.isDirectory()) read(path);
          else built.set(relative(output, path).split('\\').join('/'), readFileSync(path));
        }
      };
      read(join(output, 'featured'));
      built.set('featured.html', readFileSync(join(output, 'featured.html')));
      getAssets = () => built;
      server.middlewares.use(middleware);
    },
    handleHotUpdate({ file, server }) {
      if (file.startsWith(sourceDirectory)) server.ws.send({ type: 'full-reload' });
    },
    generateBundle() {
      for (const [fileName, source] of buildFeaturedAssets())
        this.emitFile({ type: 'asset', fileName, source });
    },
  };
}

function nextError(res: ServerResponse, error: unknown) {
  res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(error instanceof Error ? error.message : '精选构建失败');
}
