import fs from 'node:fs';
import path from 'node:path';

// Define the book classifications
const VERSE_BOOKS = new Set([
  'tang300',
  'songci300',
  'shijing',
  'huajianji',
  'nalan',
  'chuci',
  'yuefu',
  'juemiaohao',
]);
const COUPLET_BOOKS = new Set(['shenglvqimeng', 'liwengduiyun']);
const TOOL_BOOKS = new Set(['shicigelv', 'baixiangcipu', 'youxue']);

interface SourceChapter {
  title?: string;
  paras?: Array<string | string[]>;
  author?: string;
  tune?: string;
}

interface NormalizedChapter {
  title: string;
  paras: string[][];
  author?: string;
  tune?: string;
  layout: {
    type: string;
    watermark: string;
    writingMode: string;
  };
}

const TEXTS_DIR = path.resolve(process.cwd(), 'apps/study/public/texts');

if (!fs.existsSync(TEXTS_DIR)) {
  console.error(`Directory not found: ${TEXTS_DIR}`);
  process.exit(1);
}

const bookDirs = fs
  .readdirSync(TEXTS_DIR)
  .filter((name) => fs.statSync(path.join(TEXTS_DIR, name)).isDirectory());

console.log(`Found ${bookDirs.length} books to normalize.`);

let totalChaptersProcessed = 0;

for (const bookId of bookDirs) {
  const bookPath = path.join(TEXTS_DIR, bookId);
  const files = fs.readdirSync(bookPath).filter((name) => name.endsWith('.json'));

  // Determine book-level default layouts
  let layoutType: 'poetry' | 'ci' | 'couplet' | 'prose' | 'tool' = 'prose';
  let watermark: 'bamboo' | 'cloud' | 'plum' | 'none' = 'none';
  let writingMode: 'vertical' | 'horizontal' = 'horizontal';

  if (COUPLET_BOOKS.has(bookId)) {
    layoutType = 'couplet';
    watermark = 'bamboo';
  } else if (VERSE_BOOKS.has(bookId)) {
    if (bookId.includes('ci') || bookId === 'huajianji' || bookId === 'juemiaohao') {
      layoutType = 'ci';
      watermark = 'cloud';
    } else {
      layoutType = 'poetry';
      watermark = 'bamboo';
    }
    writingMode = 'vertical'; // Default verse books to vertical reading
  } else if (TOOL_BOOKS.has(bookId)) {
    layoutType = 'tool';
    watermark = 'plum';
  }

  for (const file of files) {
    if (file === 'index.json') continue;
    const filePath = path.join(bookPath, file);
    const contentRaw = fs.readFileSync(filePath, 'utf-8');
    let data: SourceChapter;

    try {
      data = JSON.parse(contentRaw) as SourceChapter;
    } catch (e) {
      console.error(`Failed to parse JSON file: ${filePath}`, e);
      continue;
    }

    const rawTitle = (data.title || '').trim();
    const rawParas = [...(data.paras || [])];

    // Preserve already-normalized metadata so rerunning this script is safe.
    let tuneName = (data.tune || '').trim();
    let cleanTitle = data.tune || data.author ? rawTitle : '';
    let poemAuthor = (data.author || '').trim();

    // 1. Bracket-based Tune extraction from first paragraph (e.g. 【菩萨蛮】 in huajianji)
    const firstPara = rawParas[0] || '';
    if (
      typeof firstPara === 'string' &&
      firstPara.trim().startsWith('【') &&
      firstPara.trim().endsWith('】')
    ) {
      const match = firstPara.trim().match(/^【(.*?)】$/);
      if (match) {
        tuneName = match[1].trim();
        rawParas.shift(); // Remove the tune header
      }
    }

    // 2. First paragraph Subtitle extraction (if it is short, has no brackets, and no punctuation)
    const nextFirstPara = rawParas[0] || '';
    const isParaSubtitle =
      typeof nextFirstPara === 'string' &&
      nextFirstPara.length <= 15 &&
      !nextFirstPara.includes('【') &&
      !nextFirstPara.includes('，') &&
      !nextFirstPara.includes('。') &&
      !nextFirstPara.includes('、');

    if (isParaSubtitle) {
      cleanTitle = nextFirstPara.trim();
      rawParas.shift(); // Remove subtitle from paras
    }

    // 3. Book-Specific Title Parsing
    if (bookId === 'tang300') {
      if (rawTitle.includes('｜')) {
        const parts = rawTitle.split('｜');
        const rest = parts[1].trim();
        const parenMatch = rest.match(/^(.*?)[(（](.*?)[)）]$/);
        if (parenMatch) {
          tuneName = parenMatch[1].trim();
          poemAuthor = parenMatch[2].trim();
        } else {
          tuneName = rest;
        }
      } else {
        const parenMatch = rawTitle.match(/^(.*?)[(（](.*?)[)）]$/);
        if (parenMatch) {
          tuneName = parenMatch[1].trim();
          poemAuthor = parenMatch[2].trim();
        } else {
          tuneName = rawTitle;
        }
      }
    } else if (bookId === 'songci300' && !data.tune && !data.author) {
      const parts = rawTitle.split(/[\u3000\s]/).filter(Boolean);
      if (parts.length >= 2) {
        tuneName = parts[0].trim();
        poemAuthor = parts[1].trim();
      } else {
        tuneName = rawTitle;
      }
    } else if (bookId === 'liwengduiyun' || bookId === 'shenglvqimeng') {
      // For couplet books, the original title field is the SECTION NAME (e.g. "一东").
      // The title content (for example, "天对地 / 雨对风 / 大陆对长空") was erroneously promoted.
      // We treat the rawTitle as the section tune name, and prepend it back to paras if it's couplet content.
      const isCoupletContent = rawTitle.includes('\u3000') || rawTitle.length > 6;
      if (isCoupletContent) {
        // It's actual couplet text, not a section label — push it back to the front of paras
        rawParas.unshift(rawTitle);
        tuneName = ''; // section name unknown
        cleanTitle = '';
      } else {
        // It's a section label like "一东"
        tuneName = rawTitle;
        cleanTitle = '';
      }
    } else if (bookId === 'huajianji') {
      poemAuthor = rawTitle; // Title is the author name, e.g. "温庭筠"
    } else if (bookId === 'nalan') {
      if (rawTitle.includes('｜')) {
        const parts = rawTitle.split('｜');
        tuneName = parts[1].trim();
      } else {
        tuneName = rawTitle;
      }
      poemAuthor = '纳兰性德';
    } else if (bookId === 'juemiaohao') {
      if (rawTitle.includes('｜')) {
        const parts = rawTitle.split('｜');
        poemAuthor = parts[0].trim();
        const rest = parts[1].trim();
        const bracketMatch =
          rest.match(/^(.*?)〔(.*?)〕$/) ||
          rest.match(/^(.*?)\[(.*?)\]$/) ||
          rest.match(/^(.*?)\((.*?)\)$/);
        if (bracketMatch) {
          tuneName = bracketMatch[1].trim();
          cleanTitle = bracketMatch[2].trim(); // Override subtitle if explicitly in brackets
        } else {
          tuneName = rest;
        }
      } else {
        tuneName = rawTitle;
      }
    } else if (bookId === 'shijing') {
      if (rawTitle.includes('｜')) {
        const parts = rawTitle.split('｜');
        tuneName = parts[1].trim();
      } else {
        tuneName = rawTitle;
      }
    } else {
      // Default fallback
      if (rawTitle.includes('｜')) {
        const parts = rawTitle.split('｜');
        tuneName = parts[1].trim();
      } else {
        const parenMatch = rawTitle.match(/^(.*?)[(（](.*?)[)）]$/);
        if (parenMatch) {
          tuneName = parenMatch[1].trim();
          poemAuthor = parenMatch[2].trim();
        } else {
          const parts = rawTitle.split(/[·・\s]/);
          if (parts.length >= 2 && parts[0].length <= 6) {
            const firstPart = parts[0];
            const isNumber = /^[一二三四五六七八九十百千]+$/.test(firstPart);
            if (!isNumber) {
              tuneName = firstPart;
              cleanTitle = parts.slice(1).join(' ');
            }
          } else {
            tuneName = rawTitle;
          }
        }
      }
    }

    // Convert tune to title for non-Ci, non-Couplet works (standard poetry, prose, etc.)
    // Couplet books keep their section name in tune so it renders as a seal badge.
    if (layoutType !== 'ci' && layoutType !== 'couplet') {
      if (tuneName && !cleanTitle) {
        cleanTitle = tuneName;
        tuneName = '';
      }
    }

    // 4. Structured Paragraphs (string[][]) Generation
    const paras: string[][] = [];

    for (const stanza of rawParas) {
      const stanzaLines: string[] = Array.isArray(stanza) ? stanza : [stanza];

      // Merge inline parenthetical comments back to the previous line
      const mergedStanzaLines: string[] = [];
      for (const line of stanzaLines) {
        const trimmed = line.trim();
        if ((trimmed.startsWith('(') || trimmed.startsWith('（')) && mergedStanzaLines.length > 0) {
          mergedStanzaLines[mergedStanzaLines.length - 1] =
            mergedStanzaLines[mergedStanzaLines.length - 1] + ' ' + trimmed;
        } else {
          mergedStanzaLines.push(line);
        }
      }

      const fullStanzaText = mergedStanzaLines.join(' ');

      if (fullStanzaText === '—— 注释 ——') {
        paras.push([fullStanzaText]);
        continue;
      }

      if (layoutType === 'couplet') {
        const lines = fullStanzaText
          .split(/(?<=。)(?!\s*[)）(（])/)
          .filter(Boolean)
          .map((s) => s.trim());
        if (lines.length > 0) paras.push(lines);
      } else if (layoutType === 'poetry' || layoutType === 'ci') {
        if (fullStanzaText.includes('\u3000')) {
          const subStanzas = fullStanzaText.split('\u3000').filter(Boolean);
          for (const subText of subStanzas) {
            const lines = subText
              .split(/(?<=[。？！；])(?!\s*[)）(（])/)
              .filter(Boolean)
              .map((s) => s.trim());
            if (lines.length > 0) paras.push(lines);
          }
        } else {
          const lines = fullStanzaText
            .split(/(?<=[。？！；])(?!\s*[)）(（])/)
            .filter(Boolean)
            .map((s) => s.trim());
          if (lines.length > 0) paras.push(lines);
        }
      } else {
        paras.push([fullStanzaText.trim()]);
      }
    }

    // Prepare restructured JSON object
    const structuredData: NormalizedChapter = {
      title: cleanTitle,
      paras,
      layout: {
        type: layoutType,
        watermark,
        writingMode,
      },
    };

    if (poemAuthor) structuredData.author = poemAuthor;
    if (tuneName) structuredData.tune = tuneName;

    // Save back to file
    fs.writeFileSync(filePath, JSON.stringify(structuredData, null, 2), 'utf-8');
    totalChaptersProcessed++;
  }
}

console.log(
  `Successfully normalized ${bookDirs.length} books and ${totalChaptersProcessed} chapters!`,
);
