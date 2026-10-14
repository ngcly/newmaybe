// Read-only deployment validation: never invokes a model or creates user data.
const app = process.argv[2];
const rawBase = process.argv[3];
const paths: Record<string, string[]> = {
  main: ['/', '/garden/', '/all-content.json', '/pagefind/pagefind.js', '/rss.xml'],
  graph: ['/', '/graph-data.json'],
  ai: ['/', '/api/security'],
  lab: ['/', '/zen-writer/'],
  studio: ['/'],
  study: ['/', '/texts/shenglvqimeng/index.json'],
  club: ['/', '/api/articles?limit=1'],
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
    if (path === '/') {
      if (!body.includes('<html') || !body.includes('</html>'))
        throw new Error('Missing HTML document');
      const assets = [...body.matchAll(/(?:src|href)="([^"<>]+\.(?:js|css))"/g)].map(
        (match) => match[1],
      );
      for (const asset of assets) {
        const res = await fetch(new URL(asset, base), { signal: AbortSignal.timeout(20_000) });
        if (!res.ok || res.headers.get('content-type')?.includes('text/html'))
          throw new Error(`Missing asset ${asset}`);
      }
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
    if (path === '/api/security') {
      const config = JSON.parse(body);
      if (config.required !== true || !config.siteKey)
        throw new Error('Production challenge not configured');
    }
    console.log(`OK ${path}`);
  }
}
void main();
