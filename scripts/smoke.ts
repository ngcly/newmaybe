// Read-only deployment validation: never invokes a model or creates user data.
import { FONT_STYLESHEET_PATH } from '../packages/shared-styles/fonts.js';

const app = process.argv[2];
const rawBase = process.argv[3];
const paths: Record<string, string[]> = {
  main: [
    '/',
    '/garden/',
    '/all-content.json',
    '/pagefind/pagefind.js',
    '/rss.xml',
    FONT_STYLESHEET_PATH,
  ],
  graph: ['/', '/graph-data.json'],
  ai: ['/', '/api/security'],
  lab: ['/', '/zen-writer/'],
  studio: ['/'],
  study: ['/', '/texts/shenglvqimeng/index.json'],
  club: [
    '/',
    '/me',
    '/admin',
    '/featured',
    '/featured/archive',
    '/api/auth/me',
    '/api/articles?limit=1',
  ],
};
async function main() {
  if (!paths[app] || !rawBase)
    throw new Error('Usage: npm run smoke -- <app> <https://deployment-url>');
  const base = new URL(rawBase);
  if (!['https:', 'http:'].includes(base.protocol))
    throw new Error('Expected an HTTP(S) deployment URL');
  const staticOnly = process.argv.includes('--static-only');
  for (const path of paths[app].filter((path) => !staticOnly || !path.startsWith('/api/'))) {
    const response = await fetch(new URL(path, base), { signal: AbortSignal.timeout(20_000) });
    if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
    const body = await response.text();
    if (path.endsWith('.json')) JSON.parse(body);
    if (path === '/' || path === '/me' || path === '/admin' || path.startsWith('/featured')) {
      if (!body.includes('<html') || !body.includes('</html>'))
        throw new Error('Missing HTML document');
      const assets = [...body.matchAll(/(?:src|href)="([^"<>]+\.(?:js|css))"/g)].map(
        (match) => match[1],
      );
      for (const asset of assets) {
        const url = new URL(asset, base);
        // A local build check covers only this site's own output. A deployment check also
        // fetches the shared font stylesheet on newmaybe.com, so it fails if main is not deployed first.
        if (staticOnly && url.origin !== base.origin) continue;
        const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
        if (!res.ok || res.headers.get('content-type')?.includes('text/html'))
          throw new Error(`Missing asset ${asset}`);
      }
    }
    if (path === '/featured' || path === '/featured/archive') {
      if (!body.includes(`<meta name="club-featured" content="${path}">`))
        throw new Error(`${path}: standalone featured document is missing`);
      if (path === '/featured' && !staticOnly) {
        const missing = await fetch(new URL('/featured/__deployment_probe_missing__', base), {
          signal: AbortSignal.timeout(20_000),
        });
        if (missing.status !== 404) throw new Error('Club missing featured issue must return 404');
      }
    }
    if ((path === '/me' || path === '/admin') && !staticOnly) {
      if (
        response.headers.get('Cache-Control') !== 'no-store' ||
        response.headers.get('X-Robots-Tag') !== 'noindex'
      )
        throw new Error(`${path}: private workspace caching or indexing headers are missing`);
    }
    if (path === '/api/auth/me') {
      if (JSON.parse(body).user !== null || response.headers.get('Cache-Control') !== 'no-store')
        throw new Error('Club anonymous session endpoint is not deployed');
      const privateResponse = await fetch(new URL('/api/manuscripts', base), {
        signal: AbortSignal.timeout(20_000),
      });
      if (privateResponse.status !== 401)
        throw new Error('Club private manuscripts must require authentication');
    }
    if (path === '/api/articles?limit=1') {
      const feed = JSON.parse(body);
      if (
        !Array.isArray(feed.articles) ||
        feed.articles.length > 1 ||
        !feed.stats ||
        !('nextOffset' in feed) ||
        feed.articles.some((article: object) => 'content' in article)
      )
        throw new Error('Club paginated summary API is not deployed');
      const id = feed.articles[0]?.id;
      if (typeof id === 'string') {
        const articlePath = `/articles/${encodeURIComponent(id)}`;
        const page = await fetch(new URL(articlePath, base), {
          headers: { Accept: 'text/html' },
          signal: AbortSignal.timeout(20_000),
        });
        const html = await page.text();
        if (
          !page.ok ||
          !html.includes('property="og:type" content="article"') ||
          !html.includes(`href="https://club.newmaybe.com${articlePath}"`) ||
          !html.includes('<div id="root"><main')
        ) {
          throw new Error('Club article HTML routing or metadata is not deployed');
        }
        console.log(`OK ${articlePath}`);
      }
      const missing = await fetch(new URL('/articles/__deployment_probe_missing__', base), {
        headers: { Accept: 'text/html' },
        signal: AbortSignal.timeout(20_000),
      });
      if (missing.status !== 404 || missing.headers.get('X-Robots-Tag') !== 'noindex')
        throw new Error('Club missing article must return a noindex 404');
    }
    if (path === FONT_STYLESHEET_PATH) {
      // Every subdomain loads these fonts cross-origin: without CORS they all fall back to system fonts.
      const font = body.match(/url\(\.\/(files\/[\w.-]+\.woff2)\)/)?.[1];
      if (!font) throw new Error(`${path}: no font files referenced`);
      const file = await fetch(new URL(font, new URL(path, base)), {
        signal: AbortSignal.timeout(20_000),
      });
      if (!file.ok) throw new Error(`${path}: missing font file ${font}`);
      if (
        !staticOnly &&
        (response.headers.get('Access-Control-Allow-Origin') !== '*' ||
          file.headers.get('Access-Control-Allow-Origin') !== '*' ||
          !file.headers.get('Cache-Control')?.includes('immutable'))
      )
        throw new Error(`${path}: shared fonts need CORS and long-lived caching headers`);
    }
    if (path === '/api/security') {
      const config = JSON.parse(body);
      if (config.required !== true || !config.siteKey)
        throw new Error('Production challenge not configured');
    }
    console.log(`OK ${path}`);
  }
}
void main();
