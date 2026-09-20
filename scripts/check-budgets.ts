import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { readWorkspaces } from './workspaces';

// Compressed JS payload budgets, independent of local network and CPU noise.
// total includes lazy chunks; chunk limits keep a single download from growing unchecked.
const budgets: Record<string, { total: number; chunk: number }> = {
  main: { total: 60, chunk: 45 },
  graph: { total: 100, chunk: 90 },
  lab: { total: 35, chunk: 25 },
  ai: { total: 110, chunk: 95 },
  studio: { total: 105, chunk: 90 },
  study: { total: 160, chunk: 100 },
  club: { total: 100, chunk: 90 },
};
const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)],
  );
const apps = process.argv.slice(2).length
  ? process.argv.slice(2)
  : readWorkspaces()
      .filter((w) => w.dir.startsWith('apps/'))
      .map((w) => w.dir.slice(5));
for (const app of apps) {
  const budget = budgets[app];
  if (!budget) throw new Error(`Missing budget for ${app}`);
  const files = walk(`apps/${app}/dist`).filter((p) => !p.includes('/pagefind/'));
  // Astro can inline entire apps. Count unique executable inline scripts too,
  // without counting the same shared layout once per generated article.
  const scripts = new Map<string, Buffer>();
  const add = (body: Buffer) => scripts.set(createHash('sha256').update(body).digest('hex'), body);
  for (const path of files) {
    if (/\.(?:m?js)$/.test(path)) add(readFileSync(path));
    if (!path.endsWith('.html')) continue;
    for (const [, attrs, body] of readFileSync(path, 'utf8').matchAll(
      /<script\b([^>]*)>([\s\S]*?)<\/script>/gi,
    )) {
      if (/\bsrc\s*=/i.test(attrs) || !body.trim()) continue;
      const type = attrs.match(/\btype\s*=\s*["']([^"']+)["']/i)?.[1];
      if (type && !['module', 'text/javascript', 'application/javascript'].includes(type)) continue;
      add(Buffer.from(body));
    }
  }
  const sizes = [...scripts.values()].map((body) => gzipSync(body).byteLength / 1024);
  const total = sizes.reduce((sum, size) => sum + size, 0);
  const largest = Math.max(0, ...sizes);
  console.log(`${app}: JS gzip ${total.toFixed(1)} KiB total / ${largest.toFixed(1)} KiB largest`);
  if (total > budget.total || largest > budget.chunk)
    throw new Error(`${app} exceeds JS budget (${budget.total}/${budget.chunk} KiB)`);
}
