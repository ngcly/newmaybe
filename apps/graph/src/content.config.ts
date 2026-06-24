import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// 相同的 Content Schema，共享数据源
const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: '../../packages/content/posts' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    category: z.string().default('随笔'),
    readingTime: z.number().optional(),
    weight: z.number().default(0),
    draft: z.boolean().default(false),
    watermark: z.string().optional(),
    connections: z.array(z.string()).optional(),
  }),
});

const fragments = defineCollection({
  loader: glob({ pattern: '**/*.md', base: '../../packages/content/fragments' }),
  schema: z.object({
    pubDate: z.coerce.date(),
    mood: z.string().optional(),
    location: z.string().optional(),
    draft: z.boolean().default(false),
    connections: z.array(z.string()).optional(),
  }),
});

const excerpts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: '../../packages/content/excerpts' }),
  schema: z.object({
    author: z.string(),
    source: z.string().optional(),
    pubDate: z.coerce.date(),
    tags: z.array(z.string()).optional(),
    comment: z.string().optional(),
    draft: z.boolean().default(false),
    connections: z.array(z.string()).optional(),
  }),
});

const notes = defineCollection({
  loader: glob({ pattern: '**/*.md', base: '../../packages/content/notes' }),
  schema: z.object({
    title: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    stage: z.enum(['sprout', 'bud', 'evergreen']).default('sprout'),
    tags: z.array(z.string()).optional(),
    connections: z.array(z.string()).optional(),
    draft: z.boolean().default(false),
  }),
});

const memories = defineCollection({
  loader: glob({ pattern: '**/*.md', base: '../../packages/content/memories' }),
  schema: z.object({
    title: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    category: z.string().default('概念'),
    connections: z.array(z.string()).optional(),
    version: z.string().default('1.0.0'),
    draft: z.boolean().default(false),
  }),
});

export const collections = { posts, fragments, excerpts, notes, memories };
