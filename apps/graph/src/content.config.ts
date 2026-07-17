import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import {
  postSchema,
  fragmentSchema,
  excerptSchema,
  noteSchema,
  memorySchema,
} from '@newmaybe/content/schemas';

const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: '../../packages/content/posts' }),
  schema: postSchema,
});

const fragments = defineCollection({
  loader: glob({ pattern: '**/*.md', base: '../../packages/content/fragments' }),
  schema: fragmentSchema,
});

const excerpts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: '../../packages/content/excerpts' }),
  schema: excerptSchema,
});

const notes = defineCollection({
  loader: glob({ pattern: '**/*.md', base: '../../packages/content/notes' }),
  schema: noteSchema,
});

const memories = defineCollection({
  loader: glob({ pattern: '**/*.md', base: '../../packages/content/memories' }),
  schema: memorySchema,
});

export const collections = { posts, fragments, excerpts, notes, memories };
