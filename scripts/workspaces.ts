import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export interface Workspace {
  dir: string;
  name: string;
  dependencies: string[];
}
export function readWorkspaces(): Workspace[] {
  return ['apps', 'packages'].flatMap((root) =>
    readdirSync(root, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .flatMap((d) => {
        const dir = join(root, d.name);
        try {
          const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
          return [
            {
              dir,
              name: pkg.name as string,
              dependencies: Object.keys({
                ...pkg.dependencies,
                ...pkg.devDependencies,
                ...pkg.peerDependencies,
              }),
            },
          ];
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
          throw error;
        }
      }),
  );
}

export function affectedApps(files: string[], workspaces: Workspace[]): string[] {
  const apps = workspaces.filter((w) => w.dir.startsWith('apps/'));
  const global = files.some(
    (file) => !file.startsWith('apps/') && !file.startsWith('packages/') && !file.endsWith('.md'),
  );
  if (global) return apps.map((w) => w.dir.slice(5)).sort();
  const changed = new Set(
    workspaces.filter((w) => files.some((file) => file.startsWith(w.dir + '/'))).map((w) => w.name),
  );
  let size = -1;
  while (size !== changed.size) {
    size = changed.size;
    for (const workspace of workspaces)
      if (workspace.dependencies.some((d) => changed.has(d))) changed.add(workspace.name);
  }
  return apps
    .filter((w) => changed.has(w.name))
    .map((w) => w.dir.slice(5))
    .sort();
}
