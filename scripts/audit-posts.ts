import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const postsDir = path.resolve(__dirname, '../packages/content/posts');

// Audit thresholds
const READING_SPEED_CHARS_PER_MIN = 350;
const READING_TIME_DEVIATION_PCT = 30;
const DESC_MIN_LENGTH = 10;
const DESC_MAX_LENGTH = 80;
const FIRST_PARA_MIN_CHARS = 30;
const FIRST_PARA_MAX_CHARS = 500;
const LAST_PARA_MIN_CHARS = 15;

interface Frontmatter {
  title: string;
  description: string;
  pubDate: string;
  updatedDate?: string;
  category: string;
  readingTime?: number;
  draft: boolean;
  watermark?: string;
}

interface PostReport {
  file: string;
  frontmatter: Frontmatter;
  bodyChars: number;
  paragraphs: number;
  sections: number;
  estimatedReadingTime: number;
  readingTimeDeviation: number; // positive = underdeclared, negative = overdeclared
  hasUpdatedDate: boolean;
  hasDescription: boolean;
  descLength: number;
  firstParaChars: number;
  lastParaChars: number;
  issues: string[];
}

function parseFrontmatter(raw: string): { fm: Frontmatter; body: string } | null {
  const normalized = raw.replace(/\r\n/g, '\n');
  const match = normalized.match(/^---\n([\s\S]*?)\n---(?:\n|$)([\s\S]*)$/);
  if (!match) return null;
  try {
    const parsed = yaml.load(match[1]) as Record<string, unknown>;
    // js-yaml parses YAML dates as Date objects; normalize to ISO date strings
    for (const key of Object.keys(parsed)) {
      if (parsed[key] instanceof Date)
        parsed[key] = (parsed[key] as Date).toISOString().slice(0, 10);
    }
    const fm = parsed as unknown as Frontmatter;
    const body = match[2].trim();
    return { fm, body };
  } catch (e) {
    console.warn('YAML parse error:', e);
    return null;
  }
}

function estimateReadingTime(chars: number): number {
  // Chinese reading speed: ~350 chars/min for deep reading
  return Math.max(1, Math.round(chars / READING_SPEED_CHARS_PER_MIN));
}

function countSections(body: string): number {
  // Count any heading level 2+ (## through ######) — not just top-level ##
  return (body.match(/^#{2,} /gm) ?? []).length;
}

function countParagraphs(body: string): number {
  const cleaned = body
    .replace(/^#{1,} .*/gm, '') // remove all heading levels (# through ######)
    .replace(/^---$/gm, '') // remove hr
    .trim();
  return cleaned.split(/\n{2,}/).filter((p) => p.trim().length > 0).length;
}

function getParagraphs(body: string): string[] {
  const cleaned = body
    .replace(/^#{1,} .*/gm, '') // remove all heading levels
    .replace(/^---$/gm, '')
    .trim();
  return cleaned.split(/\n{2,}/).filter((p) => p.trim().length > 0);
}

function analyze(files: string[]): PostReport[] {
  const reports: PostReport[] = [];

  for (const file of files) {
    const raw = fs.readFileSync(path.join(postsDir, file), 'utf-8');
    const parsed = parseFrontmatter(raw);
    if (!parsed) continue;

    const { fm, body } = parsed;
    const issues: string[] = [];
    const bodyChars = body.length;
    const sections = countSections(body);
    const paragraphs = countParagraphs(body);
    const estimated = estimateReadingTime(bodyChars);
    const declared = fm.readingTime ?? 0;
    const deviation = declared > 0 ? Math.round(((estimated - declared) / declared) * 100) : 0;
    const paras = getParagraphs(body);
    const firstParaChars = paras[0]?.length ?? 0;
    const lastParaChars = paras[paras.length - 1]?.length ?? 0;

    // --- Checks ---

    // 1. readingTime missing
    if (fm.readingTime === undefined || fm.readingTime === null) {
      issues.push('缺少 readingTime');
    }

    // 2. readingTime deviation > 30%
    if (declared > 0 && Math.abs(deviation) > READING_TIME_DEVIATION_PCT) {
      const dir = deviation > 0 ? '低估' : '高估';
      issues.push(
        `readingTime ${dir} ${Math.abs(deviation)}%（声明${declared}min，实际约${estimated}min）`,
      );
    }

    // 3. No sections for prose (not poetry)
    if (sections === 0 && fm.category !== '诗歌') {
      issues.push('无二级标题，缺少章节划分');
    }

    // 4. Description too short or too long
    const descLen = (fm.description ?? '').length;
    if (descLen === 0) {
      issues.push('缺少 description');
    } else if (descLen < DESC_MIN_LENGTH) {
      issues.push('description 过短（<10字）');
    } else if (descLen > DESC_MAX_LENGTH) {
      issues.push('description 过长（>80字）');
    }

    // 5. First paragraph too short (< 30 chars) or too long (> 500 chars) — signals pacing issue
    if (firstParaChars < FIRST_PARA_MIN_CHARS && fm.category !== '诗歌') {
      issues.push(`首段过短（${firstParaChars}字），可能缺少导语`);
    }
    if (firstParaChars > FIRST_PARA_MAX_CHARS) {
      issues.push(`首段过长（${firstParaChars}字），导语可能不够凝练`);
    }

    // 6. Last paragraph unusually short (< 15 chars) — possible abrupt ending
    if (lastParaChars < LAST_PARA_MIN_CHARS && fm.category !== '诗歌') {
      issues.push(`尾段过短（${lastParaChars}字），收束可能仓促`);
    }

    // 7. Draft but no issues (just a note)
    if (fm.draft) {
      issues.push('当前为草稿状态');
    }

    reports.push({
      file,
      frontmatter: fm,
      bodyChars,
      paragraphs,
      sections,
      estimatedReadingTime: estimated,
      readingTimeDeviation: deviation,
      hasUpdatedDate: fm.updatedDate !== undefined,
      hasDescription: descLen > 0,
      descLength: descLen,
      firstParaChars,
      lastParaChars,
      issues,
    });
  }

  return reports;
}

// ---- Main ----
const files = fs
  .readdirSync(postsDir)
  .filter((f) => f.endsWith('.md'))
  .sort();
const reports = analyze(files);

// ---- Output ----
console.log('═══════════════════════════════════════════');
console.log('  📊 文章客观质量审计报告');
console.log('═══════════════════════════════════════════\n');

// --- Summary stats ---
const published = reports.filter((r) => !r.frontmatter.draft);
const drafts = reports.filter((r) => r.frontmatter.draft);
const categories = new Map<string, PostReport[]>();
for (const r of published) {
  const cat = r.frontmatter.category;
  if (!categories.has(cat)) categories.set(cat, []);
  categories.get(cat)!.push(r);
}

console.log(`总文章数: ${reports.length}（已发布 ${published.length}，草稿 ${drafts.length}）`);
console.log(`总字数:   ${reports.reduce((s, r) => s + r.bodyChars, 0).toLocaleString()} 字`);
console.log(`总阅读时间: ${reports.reduce((s, r) => s + r.estimatedReadingTime, 0)} 分钟\n`);

console.log('发布年代分布:');
const yearBuckets = new Map<string, number>();
for (const r of published) {
  const year = r.frontmatter.pubDate.slice(0, 4);
  yearBuckets.set(year, (yearBuckets.get(year) ?? 0) + 1);
}
for (const [year, count] of [...yearBuckets].sort()) {
  const bar = '█'.repeat(count);
  console.log(`  ${year}: ${bar} (${count}篇)`);
}

console.log('\n类别分布:');
for (const [cat, posts] of [...categories].sort((a, b) => b[1].length - a[1].length)) {
  const bar = '█'.repeat(posts.length);
  console.log(`  ${cat.padEnd(4)}: ${bar} (${posts.length}篇)`);
}

// --- Per-post detail ---
console.log('\n═══════════════════════════════════════════');
console.log('  逐篇详情');
console.log('═══════════════════════════════════════════\n');

for (const r of reports) {
  const status = r.frontmatter.draft ? '📝 草稿' : '✅ 已发布';
  const updated = r.hasUpdatedDate ? ' [已修订]' : '';
  const flag = r.issues.filter((i) => !i.includes('草稿')).length > 0 ? ' ⚠️' : '';

  console.log(`━━━ ${r.file} ${status}${updated}${flag}`);
  console.log(`  标题: ${r.frontmatter.title}`);
  console.log(`  描述: ${r.frontmatter.description}`);
  console.log(`  日期: ${r.frontmatter.pubDate}`);
  console.log(`  类别: ${r.frontmatter.category}`);
  console.log(
    `  字数: ${r.bodyChars.toLocaleString()}  |  段落: ${r.paragraphs}  |  章节: ${r.sections}`,
  );
  console.log(
    `  阅读时间: 声明 ${r.frontmatter.readingTime ?? '—'}min / 实际约 ${r.estimatedReadingTime}min (偏差 ${r.readingTimeDeviation >= 0 ? '+' : ''}${r.readingTimeDeviation}%)`,
  );

  const nonDraftIssues = r.issues.filter((i) => !i.includes('草稿'));
  if (nonDraftIssues.length > 0) {
    console.log(`  ⚠️  问题:`);
    for (const issue of nonDraftIssues) {
      console.log(`      • ${issue}`);
    }
  } else {
    console.log(`  ✨ 无需改进项`);
  }
  console.log();
}

// --- Overall issues summary ---
console.log('═══════════════════════════════════════════');
console.log('  待改进汇总');
console.log('═══════════════════════════════════════════\n');

const allIssues = reports.flatMap((r) =>
  r.issues
    .filter((i) => !i.includes('草稿'))
    .map((i) => ({ file: r.file, title: r.frontmatter.title, issue: i })),
);

if (allIssues.length === 0) {
  console.log('  🎉 所有已发布文章无客观问题！');
} else {
  // Group by issue type
  const groups = new Map<string, typeof allIssues>();
  for (const item of allIssues) {
    const key = item.issue.replace(/（.*/, '');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }
  for (const [key, items] of groups) {
    console.log(`  ${key} (${items.length}篇):`);
    for (const item of items) {
      console.log(`    - ${item.title} (${item.file})`);
    }
  }
}
