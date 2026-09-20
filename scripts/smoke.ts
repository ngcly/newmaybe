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
  club: ['/'],
};
async function main() {
  if (!paths[app] || !rawBase)
    throw new Error('Usage: npm run smoke -- <app> <https://deployment-url>');
  const base = new URL(rawBase);
  if (!['https:', 'http:'].includes(base.protocol))
    throw new Error('Expected an HTTP(S) deployment URL');
  for (const path of paths[app]) {
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
    if (path === '/api/security') {
      const config = JSON.parse(body);
      if (config.required !== true || !config.siteKey)
        throw new Error('Production challenge not configured');
    }
    console.log(`OK ${path}`);
  }
}
void main();
