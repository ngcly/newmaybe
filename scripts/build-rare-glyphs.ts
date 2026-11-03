// Builds the rare-glyph faces that back up Noto Serif SC for the Study texts: Han characters the
// texts use that Fontsource's Noto Serif SC slices leave out (extensions A–H, plus RESTORED).
// Without them the reader falls back to a system font, and extension B+ characters show as boxes
// on macOS and iOS. Glyphs come from the full Noto Serif SC where it has them, else from Jigmo.
// The output in packages/shared-styles/rare-glyphs is committed and published by
// scripts/build-shared-fonts.ts with the other fonts. Run `npm run fonts:rare` after the texts
// change; it needs Python fontTools (`pip3 install fonttools brotli`) and the SOURCES fonts
// downloaded into SOURCE_DIR.
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const TEXTS_DIR = join(root, 'apps/study/public/texts');
const SOURCE_DIR = join(root, 'node_modules/.cache/rare-glyph-sources');
export const RARE_GLYPHS_DIR = join(root, 'packages/shared-styles/rare-glyphs');

const JIGMO = 'https://kamichikoichi.github.io/jigmo/Jigmo-20250912.zip';
// In order of preference: Noto matches the body text, Jigmo covers every extension.
const SOURCES = [
  {
    id: 'noto',
    file: 'NotoSerifSC-Regular.otf',
    url: 'https://github.com/notofonts/noto-cjk/raw/main/Serif/SubsetOTF/SC/NotoSerifSC-Regular.otf',
    license: 'SIL Open Font License 1.1',
  },
  { id: 'jigmo', file: 'Jigmo.ttf', url: JIGMO, license: 'CC0 1.0' },
  { id: 'jigmo2', file: 'Jigmo2.ttf', url: JIGMO, license: 'CC0 1.0' },
  { id: 'jigmo3', file: 'Jigmo3.ttf', url: JIGMO, license: 'CC0 1.0' },
];

// Basic-block characters that Fontsource lacks and the text cleanup restored (from <部件>
// placeholders, private-use and garbled characters). The other basic-block characters it lacks
// (about 1,940) still fall back to system fonts.
const RESTORED = [
  '侲僛儠刓剸匵咇咈咮唊唚啅啽喭噇噮嚈塪媢屩岇岏崪崿嵲嶻幍幰彄忺悤悷憪懎捘掯揌搊搕搘',
  '搳摴攦斮斸杅杙枲枿柮梪棔椑椵槥橃櫑欀欱歍毾洭滱澟瀡瀱焍熛熢犨狤狫瑇甒甖痆痑盄眊眜',
  '睟瞂瞚瞤瞫矼磶祋禖秬穄穼筥篏簴籝籰絍絙緺纕绖缹罦罬羓聻肐胘胣胹胾腷膋膎膫膰膹臡茞',
  '茩莝菆萯葅葌葹薋薲藋虋虨虪虸蚄蚿蛂蛈蛚蛣蜹蜼螉螝螾蟁蟢蠒蠮蠾袔袚袟裩褧褵襔襢觡觻',
  '觾謑谾貈貜跐跴踖踠踧蹏蹧躆躧軥軬輀輠轣迆迾遬遰鄩鄽醁醦醲醶醼醽釱鈚鉐鋡錔鍱鏚镮闬',
  '阸雊雘霣靤靸鞓韎韐顦飵飺餗餥餦餭饆饠馂駬騋騞驔驲骭髆髲髶髾鬅鬌鬒鬕鬙鬺魌魧鮆鮧鯶',
  '鯸鰡鱄鱮鳷鴘鵴鵹鵽鷃鷠鸃鸆鸧鹔鹙鹥鹲鹴麀麨黡鼒鼕',
].join('');
// Small faces, so a chapter downloads only the few rare glyphs it shows.
const CHARS_PER_FACE = 16;

export interface RareGlyphFace {
  file: string;
  source: string;
  chars: string;
}
export interface RareGlyphManifest {
  sources: { id: string; url: string; license: string }[];
  faces: RareGlyphFace[];
}

// Code points Fontsource's Noto Serif SC slices cover (every weight shares the same slices).
function fontsourceRanges(): [number, number][] {
  const fonts = createRequire(join(root, 'apps/main/package.json'));
  const css = readFileSync(fonts.resolve('@fontsource/noto-serif-sc/400.css'), 'utf8');
  return [...css.matchAll(/unicode-range:\s*([^;]+);/g)].flatMap((m) =>
    m[1].split(',').map((range) => {
      const [start, end = start] = range.trim().slice(2).split('-');
      return [parseInt(start, 16), parseInt(end, 16)] as [number, number];
    }),
  );
}

/** Han characters in the Study texts that need a rare-glyph face, sorted by code point. */
export function rareCharacters(): string[] {
  // Extension A, the compatibility block and extensions B–H, plus RESTORED. A plain character
  // class scans the texts much faster than \p{Unified_Ideograph}.
  const candidate = new RegExp(
    `[\\u3400-\\u4dbf\\uf900-\\ufaff\\u{20000}-\\u{323af}${RESTORED}]`,
    'gu',
  );
  const ideographs = new Set<string>();
  for (const book of readdirSync(TEXTS_DIR)) {
    if (!book.match(/^[a-z0-9]+$/)) continue;
    for (const file of readdirSync(join(TEXTS_DIR, book)).filter((f) => f.endsWith('.json')))
      for (const [ch] of readFileSync(join(TEXTS_DIR, book, file), 'utf8').matchAll(candidate))
        ideographs.add(ch);
  }
  const ranges = fontsourceRanges();
  const covered = (cp: number) => ranges.some(([start, end]) => start <= cp && cp <= end);
  return [...ideographs]
    .filter((ch) => !covered(ch.codePointAt(0)!))
    .sort((a, b) => a.codePointAt(0)! - b.codePointAt(0)!);
}

const hex = (ch: string) => ch.codePointAt(0)!.toString(16).toUpperCase();

function python(args: string[]): string {
  return execFileSync('python3', args, { encoding: 'utf8', maxBuffer: 1 << 26 });
}

// Which of the characters a font has a glyph for.
function glyphsIn(font: string, chars: string[]): Set<string> {
  const script =
    'import sys\nfrom fontTools.ttLib import TTFont\n' +
    'cmap = TTFont(sys.argv[1], lazy=True).getBestCmap()\n' +
    'print(" ".join(c for c in sys.argv[2:] if int(c, 16) in cmap))';
  const found = python(['-c', script, font, ...chars.map(hex)])
    .trim()
    .split(/\s+/);
  return new Set(found.filter(Boolean).map((cp) => String.fromCodePoint(parseInt(cp, 16))));
}

function subset(font: string, chars: string[], output: string, woff2: boolean) {
  python([
    '-m',
    'fontTools.subset',
    font,
    `--unicodes=${chars.map((ch) => `U+${hex(ch)}`).join(',')}`,
    ...(woff2 ? ['--flavor=woff2'] : []),
    '--no-hinting',
    // Keep the copyright and license records the licenses ask copies to carry.
    '--name-IDs=*',
    `--output-file=${output}`,
  ]);
}

export function buildRareGlyphs(outDir = RARE_GLYPHS_DIR): RareGlyphManifest {
  let remaining = rareCharacters();
  const faces: RareGlyphFace[] = [];
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  for (const source of SOURCES) {
    const font = join(SOURCE_DIR, source.file);
    const has = glyphsIn(font, remaining);
    const chars = remaining.filter((ch) => has.has(ch));
    remaining = remaining.filter((ch) => !has.has(ch));
    if (chars.length === 0) continue;
    // Loading a full CJK font takes a while, so cut it down once and split the small copy.
    const all = join(SOURCE_DIR, `${source.id}-rare${source.file.slice(-4)}`);
    subset(font, chars, all, false);
    for (let i = 0; i < chars.length; i += CHARS_PER_FACE) {
      const chunk = chars.slice(i, i + CHARS_PER_FACE);
      const file = `${source.id}-${faces.filter((f) => f.source === source.id).length}.woff2`;
      subset(all, chunk, join(outDir, file), true);
      faces.push({ file, source: source.id, chars: chunk.join('') });
    }
  }
  if (remaining.length > 0) throw Error(`没有字体收录：${remaining.join('')}`);
  const manifest: RareGlyphManifest = {
    sources: SOURCES.map(({ id, url, license }) => ({ id, url, license })),
    faces,
  };
  writeFileSync(join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  return manifest;
}

if (process.argv[1] && basename(process.argv[1]) === basename(fileURLToPath(import.meta.url))) {
  const { faces } = buildRareGlyphs();
  const chars = faces.reduce((n, face) => n + [...face.chars].length, 0);
  console.log(`rare glyphs: ${chars} characters in ${faces.length} faces → ${RARE_GLYPHS_DIR}`);
}
