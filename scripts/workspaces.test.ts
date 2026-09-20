import { describe, it, expect } from 'vitest';
import { affectedApps, type Workspace } from './workspaces';
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
});
