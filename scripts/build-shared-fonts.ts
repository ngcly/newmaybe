// Builds the font bundle every newmaybe site links to (https://newmaybe.com/fonts/<version>/fonts.css)
// into apps/main/public, so the main site publishes it. Runs before the main site's dev and build.
// Chinese faces use Fontsource's per-character slices: a page downloads only the slices it renders.
// Rare characters of the Study texts that those slices lack come from the committed faces in
// packages/shared-styles/rare-glyphs (see scripts/build-rare-glyphs.ts).
// Only woff2 is published. File names carry a content hash so they can be cached forever.
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FONT_VERSION } from '../packages/shared-styles/fonts.js';
import type { RareGlyphManifest } from './build-rare-glyphs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
// Resolve from the main site, which declares the Fontsource packages it publishes.
const fontPackages = createRequire(join(root, 'apps/main/package.json'));

const NOTO_WEIGHTS = [300, 400, 500, 600, 700];

export const fontSources = [
  ...NOTO_WEIGHTS.map((weight) => `@fontsource/noto-serif-sc/${weight}.css`),
  '@fontsource/cormorant-garamond/latin-400.css',
  '@fontsource/cormorant-garamond/latin-400-italic.css',
  '@fontsource/cormorant-garamond/latin-600.css',
  '@fontsource/ma-shan-zheng/400.css',
];

const RARE_GLYPHS_DIR = join(root, 'packages/shared-styles/rare-glyphs');

const SOURCE =
  /url\(\.\/files\/([\w-]+)\.woff2\) format\('woff2'\)(?:, url\(\.\/files\/[\w-]+\.woff\) format\('woff'\))?/g;

const hashedName = (name: string, data: Buffer) =>
  `${name}.${createHash('sha256').update(data).digest('hex').slice(0, 8)}.woff2`;

// The rare faces join the Noto Serif SC family: unicode-range sends only their characters to them.
// Each file is declared once per NOTO_WEIGHTS entry, since Chrome leaves a `300 700` range face out when
// the family has a face of exactly the wanted weight. The browser downloads the shared file once.
function rareGlyphFaces(files: Map<string, Buffer>): string {
  const manifest: RareGlyphManifest = JSON.parse(
    readFileSync(join(RARE_GLYPHS_DIR, 'manifest.json'), 'utf8'),
  );
  return manifest.faces
    .flatMap(({ file, source, chars }) => {
      const data = readFileSync(join(RARE_GLYPHS_DIR, file));
      const hashed = hashedName(`rare-${basename(file, '.woff2')}`, data);
      files.set(hashed, data);
      const range = [...chars].map((ch) => `U+${ch.codePointAt(0)!.toString(16)}`).join(',');
      return NOTO_WEIGHTS.map(
        (weight) => `/* rare-glyphs/${file} (${source}) */
@font-face {
  font-family: 'Noto Serif SC';
  font-style: normal;
  font-display: swap;
  font-weight: ${weight};
  src: url(./files/${hashed}) format('woff2');
  unicode-range: ${range};
}`,
      );
    })
    .join('\n');
}

export function buildSharedFonts(outDir = join(root, 'apps/main/public/fonts', FONT_VERSION)) {
  const files = new Map<string, Buffer>();
  const css = fontSources
    .map((source) => {
      const path = fontPackages.resolve(source);
      const rewritten = readFileSync(path, 'utf8').replace(SOURCE, (_, name: string) => {
        const data = readFileSync(join(dirname(path), 'files', `${name}.woff2`));
        const hashed = hashedName(name, data);
        files.set(hashed, data);
        return `url(./files/${hashed}) format('woff2')`;
      });
      // Any source left without a content hash means Fontsource changed its CSS format.
      if (/files\/[\w-]+\.woff2?\)/.test(rewritten)) throw Error(`无法解析字体文件：${source}`);
      return `/* ${source} */\n${rewritten}`;
    })
    .concat(rareGlyphFaces(files))
    .join('\n');
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(join(outDir, 'files'), { recursive: true });
  for (const [name, data] of files) writeFileSync(join(outDir, 'files', name), data);
  writeFileSync(
    join(outDir, 'fonts.css'),
    `/* newmaybe 全站共用字体 ${FONT_VERSION} · 由 scripts/build-shared-fonts.ts 生成，勿手改 */\n${css}`,
  );
  return {
    outDir,
    files: files.size,
    bytes: [...files.values()].reduce((s, d) => s + d.length, 0),
  };
}

if (process.argv[1] && basename(process.argv[1]) === basename(fileURLToPath(import.meta.url))) {
  const { outDir, files, bytes } = buildSharedFonts();
  console.log(`shared fonts: ${files} files, ${(bytes / 1048576).toFixed(1)} MiB → ${outDir}`);
}
