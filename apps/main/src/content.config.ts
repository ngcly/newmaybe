import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Astro 6：使用 Content Layer API 的 glob loader（旧的 type:'content' 已移除）
const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: '../../packages/content/posts' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),          // frontmatter 写 "2026-05-20" 即可
    updatedDate: z.coerce.date().optional(),
    category: z.string().default('随笔'),  // 显示在标题下，如 随笔 / 观察
    readingTime: z.number().optional(),    // 预计阅读分钟数
    weight: z.number().default(0),          // 列表展示权重，数值越高越靠前；同权重按日期倒序
    draft: z.boolean().default(false),     // true = 草稿，不在列表显示
    watermark: z.string().optional(),       // 诗歌水印字，如 '雨'、'月'
    connections: z.array(z.string()).optional(), // 关联节点格式: 'notes/some-note', 'excerpts/some-excerpt'
  }),
});

// 念头碎片集 —— 轻短的灵感、句子、随手记
const fragments = defineCollection({
  loader: glob({ pattern: '**/*.md', base: '../../packages/content/fragments' }),
  schema: z.object({
    pubDate: z.coerce.date(),            // 记录日期
    mood: z.string().optional(),         // 心情/氛围词，如 '雨天'、'凌晨三点'
    location: z.string().optional(),     // 地点，如 '咸宁'、'高铁上'
    draft: z.boolean().default(false),
    connections: z.array(z.string()).optional(),
  }),
});

// 拾遗集 —— 经典语句、片段摘录与随感
const excerpts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: '../../packages/content/excerpts' }),
  schema: z.object({
    author: z.string(),                  // 原作者
    source: z.string().optional(),       // 出处书名/篇名
    pubDate: z.coerce.date(),            // 摘录日期
    tags: z.array(z.string()).optional(), // 标签
    comment: z.string().optional(),      // 个人短评/随感
    draft: z.boolean().default(false),
    connections: z.array(z.string()).optional(),
  }),
});

// 落叶集·笔记 —— 半结构化思考、持续演化中
const notes = defineCollection({
  loader: glob({ pattern: '**/*.md', base: '../../packages/content/notes' }),
  schema: z.object({
    title: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    stage: z.enum(['sprout', 'bud', 'evergreen']).default('sprout'), // 🌱 🌿 🌳
    tags: z.array(z.string()).optional(),
    connections: z.array(z.string()).optional(),
    draft: z.boolean().default(false),
  }),
});

// 记忆档案库 —— 长期沉淀、结构化常青树概念
const memories = defineCollection({
  loader: glob({ pattern: '**/*.md', base: '../../packages/content/memories' }),
  schema: z.object({
    title: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    category: z.string().default('概念'), // 如 "哲学" / "技术" / "心理学"
    connections: z.array(z.string()).optional(),
    version: z.string().default('1.0.0'),
    draft: z.boolean().default(false),
  }),
});

export const collections = { posts, fragments, excerpts, notes, memories };
