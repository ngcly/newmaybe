/**
 * npm run new [type] [name?]
 *
 * 快速创建新内容并在编辑器中打开。
 *
 * 用法：
 *   npm run new fragment              # 今日念头（零交互）
 *   npm run new fragment morning      # 指定文件名关键词
 *   npm run new note                  # 笔记（交互式填 title/slug/stage）
 *   npm run new post                  # 文章（交互式，默认 draft:true）
 *   npm run new excerpt               # 拾遗模板（零交互）
 */

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT = path.join(ROOT, 'packages/content');

// ── 日期工具 ──────────────────────────────────

const now = new Date();
// Use local time throughout to avoid UTC/local mismatch around midnight
const yyyy = String(now.getFullYear());
const mm = String(now.getMonth() + 1).padStart(2, '0');
const dd = String(now.getDate()).padStart(2, '0');
const isoDate = `${yyyy}-${mm}-${dd}`;
const dateSlug = `${yyyy.slice(2)}${mm}${dd}`;

// ── 交互工具 ──────────────────────────────────

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function ask(question: string, fallback = ''): Promise<string> {
  return new Promise((resolve) => {
    const prompt = fallback ? `${question} [${fallback}]: ` : `${question}: `;
    rl.question(prompt, (ans) => {
      const trimmed = ans.trim();
      resolve(trimmed || fallback);
    });
  });
}

function choose(question: string, options: string[], defaultIdx = 0): Promise<string> {
  const opts = options.map((o, i) => `${i + 1}) ${o}`).join('  ');
  return new Promise((resolve) => {
    rl.question(`${question} (${opts}) [${defaultIdx + 1}]: `, (ans) => {
      const n = Number.parseInt(ans.trim()) - 1;
      resolve(options[Number.isNaN(n) || n < 0 || n >= options.length ? defaultIdx : n]);
    });
  });
}

// ── 文件创建 ──────────────────────────────────

function openInEditor(filePath: string) {
  const editor = process.env.EDITOR || (process.platform === 'darwin' ? 'code' : 'nano');
  try {
    spawn(editor, [filePath], { detached: true, stdio: 'ignore' }).unref();
    console.log(`\n✓ 已在 ${editor} 中打开：${path.relative(ROOT, filePath)}`);
  } catch (e) {
    console.warn('Failed to open editor, file may need to be opened manually', e);
    console.log(`\n✓ 文件已创建：${path.relative(ROOT, filePath)}`);
    console.log(`  （无法自动打开编辑器，请手动打开）`);
  }
}

function writeFile(filePath: string, content: string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  if (fs.existsSync(filePath)) {
    console.error(`\n✗ 文件已存在：${path.relative(ROOT, filePath)}`);
    process.exit(1);
  }
  fs.writeFileSync(filePath, content, 'utf-8');
}

// ── 各类型创建逻辑 ────────────────────────────

async function createFragment(keyword?: string) {
  const slug = keyword ? `${dateSlug}-${keyword}` : dateSlug;
  const filePath = path.join(CONTENT, 'fragments', `${slug}.md`);
  const content = `---
pubDate: ${isoDate}
---

`;
  writeFile(filePath, content);
  openInEditor(filePath);
}

async function createNote() {
  const title = await ask('标题');
  if (!title) {
    console.error('✗ 标题不能为空');
    process.exit(1);
  }

  const defaultSlug = dateSlug + '-note';
  const slug = await ask('英文 slug', defaultSlug);
  const stage = await choose('成长阶段', ['sprout 🌱', 'bud 🌿', 'evergreen 🌳'], 0);
  const stageKey = stage.split(' ')[0];

  const filePath = path.join(CONTENT, 'notes', `${slug}.md`);
  const content = `---
title: ${title}
pubDate: ${isoDate}
stage: ${stageKey}
tags: []
---

`;
  writeFile(filePath, content);
  openInEditor(filePath);
}

async function createPost() {
  const title = await ask('标题');
  if (!title) {
    console.error('✗ 标题不能为空');
    process.exit(1);
  }

  const defaultSlug = dateSlug + '-post';
  const slug = await ask('英文 slug', defaultSlug);
  const description = await ask('简介（一句话）');
  const category = await choose('分类', ['随笔', '诗歌', '散文', '观察'], 0);

  const filePath = path.join(CONTENT, 'posts', `${slug}.md`);
  const content = `---
title: ${title}
description: ${description}
pubDate: ${isoDate}
category: ${category}
readingTime: 5
weight: 0
draft: true
---

`;
  writeFile(filePath, content);
  openInEditor(filePath);
}

async function createExcerpt(keyword?: string) {
  const slug = keyword ? `${dateSlug}-${keyword}` : dateSlug;
  const filePath = path.join(CONTENT, 'excerpts', `${slug}.md`);
  const content = `---
author: ""
pubDate: ${isoDate}
tags: []
---

`;
  writeFile(filePath, content);
  openInEditor(filePath);
}

// ── 入口 ──────────────────────────────────────

const [type, keyword] = process.argv.slice(2);
const TYPES = ['fragment', 'note', 'post', 'excerpt'];

if (!type || !TYPES.includes(type)) {
  console.log(`用法：npm run new <type> [keyword]`);
  console.log(`类型：${TYPES.join(' | ')}`);
  console.log(`\n示例：`);
  console.log(`  npm run new fragment`);
  console.log(`  npm run new fragment morning`);
  console.log(`  npm run new note`);
  console.log(`  npm run new post`);
  console.log(`  npm run new excerpt`);
  console.log(`  npm run new excerpt luotuoxiangzi  # 同天第二条拾遗加关键词区分`);
  process.exit(0);
}

console.log(`\n📝 新建 ${type}...\n`);

(async () => {
  try {
    if (type === 'fragment') await createFragment(keyword);
    else if (type === 'note') await createNote();
    else if (type === 'post') await createPost();
    else if (type === 'excerpt') await createExcerpt(keyword);
  } finally {
    rl.close();
  }
})();
