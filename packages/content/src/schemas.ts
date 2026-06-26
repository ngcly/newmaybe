import { z } from 'zod';

export const postSchema = z.object({
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
});

export const fragmentSchema = z.object({
  pubDate: z.coerce.date(),
  mood: z.string().optional(),
  location: z.string().optional(),
  draft: z.boolean().default(false),
  connections: z.array(z.string()).optional(),
});

export const excerptSchema = z.object({
  author: z.string(),
  source: z.string().optional(),
  pubDate: z.coerce.date(),
  tags: z.array(z.string()).optional(),
  comment: z.string().optional(),
  draft: z.boolean().default(false),
  connections: z.array(z.string()).optional(),
});

export const noteSchema = z.object({
  title: z.string(),
  pubDate: z.coerce.date(),
  updatedDate: z.coerce.date().optional(),
  stage: z.enum(['sprout', 'bud', 'evergreen']).default('sprout'),
  tags: z.array(z.string()).optional(),
  connections: z.array(z.string()).optional(),
  draft: z.boolean().default(false),
});

export const memorySchema = z.object({
  title: z.string(),
  pubDate: z.coerce.date(),
  updatedDate: z.coerce.date().optional(),
  category: z.string().default('概念'),
  connections: z.array(z.string()).optional(),
  version: z.string().default('1.0.0'),
  draft: z.boolean().default(false),
});
