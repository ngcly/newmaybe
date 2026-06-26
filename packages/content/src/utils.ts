const SUBDOMAINS: [string, string][] = [
  ['graph.newmaybe.com', 'http://localhost:4322'],
  ['tools.newmaybe.com', 'http://localhost:4323'],
  ['ai.newmaybe.com', 'http://localhost:4324'],
  ['lab.newmaybe.com', 'http://localhost:4325'],
  ['studio.newmaybe.com', 'http://localhost:4326'],
  ['newmaybe.com', 'http://localhost:4321'],  // must be last — most general match
];

export function resolveSubdomain(url: string, isDev: boolean): string {
  if (!isDev) return url;
  for (const [domain, local] of SUBDOMAINS) {
    if (url.includes(domain)) return url.replace(`https://${domain}`, local);
  }
  return url;
}
