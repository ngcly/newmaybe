import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { rareCharacters } from './build-rare-glyphs';
import { buildSharedFonts, fontSources } from './build-shared-fonts';

const out = mkdtempSync(join(tmpdir(), 'newmaybe-fonts-'));
let files = 0;
let css = '';
beforeAll(() => {
  files = buildSharedFonts(out).files;
  css = readFileSync(join(out, 'fonts.css'), 'utf8');
});
afterAll(() => rmSync(out, { recursive: true, force: true }));

it('publishes hashed woff2 files and a stylesheet that references only them', () => {
  const referenced = [...css.matchAll(/url\(\.\/files\/([^)]+)\) format\('woff2'\)/g)].map(
    (m) => m[1],
  );

  expect(css).not.toMatch(/\.woff\)|format\('woff'\)|fonts\.g/);
  expect(referenced.length).toBe(css.match(/@font-face/g)?.length);
  expect(new Set(referenced).size).toBe(files);
  expect(readdirSync(join(out, 'files'))).toHaveLength(files);
  for (const name of referenced) {
    expect(name).toMatch(/^[\w-]+\.[0-9a-f]{8}\.woff2$/);
    expect(existsSync(join(out, 'files', name))).toBe(true);
  }
  for (const family of ['Noto Serif SC', 'Cormorant Garamond', 'Ma Shan Zheng'])
    expect(css).toContain(`font-family: '${family}'`);
  for (const weight of [300, 400, 500, 600, 700]) expect(css).toContain(`font-weight: ${weight}`);
  expect(fontSources.length).toBeGreaterThan(0);
});

it('backs every rare character of the Study texts with a published face', () => {
  const rareFaces = [...css.matchAll(/\/\* rare-glyphs\/[^*]+\*\/\n@font-face \{([^}]*)\}/g)];
  const covered = new Set(
    rareFaces.flatMap(([, face]) =>
      face
        .match(/unicode-range: ([^;]+);/)![1]
        .split(',')
        .map((cp) => String.fromCodePoint(parseInt(cp.slice(2), 16))),
    ),
  );
  expect(rareFaces.length).toBeGreaterThan(0);
  for (const [, face] of rareFaces) expect(face).toContain("font-family: 'Noto Serif SC'");
  // Chrome matches a face of the exact weight only, so every Noto weight needs its own rare faces.
  for (const weight of [300, 400, 500, 600, 700])
    expect(rareFaces.some(([, face]) => face.includes(`font-weight: ${weight};`))).toBe(true);
  // A failure here means the texts gained characters: run `npm run fonts:rare`.
  expect(rareCharacters().filter((ch) => !covered.has(ch))).toEqual([]);
});
