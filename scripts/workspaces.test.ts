import { describe, it, expect } from 'vitest';
import { affectedApps, readWorkspaces, type Workspace } from './workspaces';
const workspaces: Workspace[] = [
  { dir: 'packages/tokens', name: 'tokens', dependencies: [] },
  { dir: 'packages/styles', name: 'styles', dependencies: ['tokens'] },
  { dir: 'apps/main', name: 'main', dependencies: ['styles'] },
  { dir: 'apps/ai', name: 'ai', dependencies: ['styles'] },
  { dir: 'apps/club', name: 'club', dependencies: [] },
];
describe('CI change selection', () => {
  it('includes transitive consumers', () =>
    expect(affectedApps(['packages/tokens/index.ts'], workspaces)).toEqual(['ai', 'main']));
  it('selects app-local changes only', () =>
    expect(affectedApps(['apps/club/src/App.tsx'], workspaces)).toEqual(['club']));
  it.each([
    'package-lock.json',
    '.github/workflows/ci.yml',
    'scripts/build.ts',
    'e2e/flows.spec.ts',
  ])('rebuilds all for %s', (file) =>
    expect(affectedApps([file], workspaces)).toEqual(['ai', 'club', 'main']),
  );
  it('skips root docs but includes content Markdown', () => {
    expect(affectedApps(['README.md'], workspaces)).toEqual([]);
    expect(affectedApps(['apps/main/readme.md'], workspaces)).toEqual(['main']);
  });
  it('reads real workspaces with POSIX separators', () => {
    // path.join yields `apps\main` on Windows, which never matched the
    // forward-slash paths git reports and silently selected zero apps.
    const dirs = readWorkspaces().map((w) => w.dir);
    expect(dirs).toContain('apps/main');
    expect(dirs.some((dir) => dir.includes('\\'))).toBe(false);
  });
  it('selects real apps for a real change set', () => {
    expect(affectedApps(['apps/club/src/App.tsx'], readWorkspaces())).toEqual(['club']);
  });
});
