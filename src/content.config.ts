import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Astro 6：使用 Content Layer API 的 glob loader（旧的 type:'content' 已移除）
const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),
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
  }),
});

// 念头碎片集 —— 轻短的灵感、句子、随手记
const fragments = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/fragments' }),
  schema: z.object({
    pubDate: z.coerce.date(),            // 记录日期
    mood: z.string().optional(),         // 心情/氛围词，如 '雨天'、'凌晨三点'
    location: z.string().optional(),     // 地点，如 '咸宁'、'高铁上'
    draft: z.boolean().default(false),
  }),
});

export const collections = { posts, fragments };
