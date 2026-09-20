import { z } from 'zod';

const title = z.string().trim().min(1);
const connections = z
  .array(
    z
      .string()
      .regex(
        /^(posts|notes|fragments|excerpts|memories)\/[^\s/#?]+(?:\/[^\s/#?]+)*$/,
        'connections 必须为 collection/slug',
      )
      .refine((value) => !value.split('/').some((part) => part === '.' || part === '..')),
  )
  .optional();
const datesInOrder = (data: { pubDate: Date; updatedDate?: Date }) =>
  !data.updatedDate || data.updatedDate >= data.pubDate;
const dateError = { message: 'updatedDate 不得早于 pubDate', path: ['updatedDate'] };
const dated = {
  pubDate: z.coerce.date(),
  draft: z.boolean().default(false),
  connections,
};

export const postSchema = z
  .object({
    ...dated,
    title,
    description: z
      .string()
      .min(10, 'description 不得少于 10 字')
      .max(80, 'description 不得超过 80 字'),
    updatedDate: z.coerce.date().optional(),
    category: z.enum(['随笔', '诗歌', '散文', '观察', '故事', '小说']).default('随笔'),
    readingTime: z.number().int().positive().optional(),
    weight: z.number().int().default(0),
    watermark: z
      .string()
      .refine(
        (value) => [...value].length === 1 && value.trim().length > 0,
        'watermark 必须为一个字符',
      )
      .optional(),
  })
  .refine(datesInOrder, dateError);

export const fragmentSchema = z.object({
  ...dated,
  mood: z.string().optional(),
  location: z.string().optional(),
});

export const excerptSchema = z.object({
  ...dated,
  author: title,
  source: z.string().optional(),
  tags: z.array(z.string()).optional(),
  comment: z.string().optional(),
});

export const noteSchema = z
  .object({
    ...dated,
    title,
    updatedDate: z.coerce.date().optional(),
    stage: z.enum(['sprout', 'bud', 'evergreen']).default('sprout'),
    tags: z.array(z.string()).optional(),
  })
  .refine(datesInOrder, dateError);

export const memorySchema = z
  .object({
    ...dated,
    title,
    updatedDate: z.coerce.date().optional(),
    category: z.string().default('概念'),
    version: z
      .string()
      .regex(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/)
      .default('1.0.0'),
  })
  .refine(datesInOrder, dateError);
