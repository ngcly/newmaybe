const SUBDOMAINS: [string, string][] = [
  ['graph.newmaybe.com', 'http://localhost:4322'],
  ['tools.newmaybe.com', 'http://localhost:4323'],
  ['ai.newmaybe.com', 'http://localhost:4324'],
  ['lab.newmaybe.com', 'http://localhost:4325'],
  ['studio.newmaybe.com', 'http://localhost:4326'],
  ['newmaybe.com', 'http://localhost:4321'],
];

export function resolveSubdomain(url: string, isDev: boolean): string {
  if (!isDev) return url;
  try {
    const parsed = new URL(url);
    for (const [domain, local] of SUBDOMAINS) {
      if (parsed.hostname === domain) {
        // Replace only the origin part, preserving the path and query string
        return url.replace(parsed.origin, local);
      }
    }
  } catch {
    // Invalid URL — return as-is
  }
  return url;
}
