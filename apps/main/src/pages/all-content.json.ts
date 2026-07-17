import type { APIRoute } from 'astro';
import { getCollection, type CollectionEntry } from 'astro:content';
import { SITE } from '../config';

interface ContentItem {
  id: string;
  title: string;
  type: string;
  category: string;
  url: string;
  content: string;
  pubDate: string;
  connections?: string[];
  stage?: 'sprout' | 'bud' | 'evergreen';
}

export const GET: APIRoute = async () => {
  const posts = await getCollection('posts', ({ data }: CollectionEntry<'posts'>) => !data.draft);
  const notes = await getCollection('notes', ({ data }: CollectionEntry<'notes'>) => !data.draft);
  const memories = await getCollection(
    'memories',
    ({ data }: CollectionEntry<'memories'>) => !data.draft,
  );
  const excerpts = await getCollection(
    'excerpts',
    ({ data }: CollectionEntry<'excerpts'>) => !data.draft,
  );
  const fragments = await getCollection(
    'fragments',
    ({ data }: CollectionEntry<'fragments'>) => !data.draft,
  );

  const items: ContentItem[] = [];

  const fmtDate = (d: Date) =>
    d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'numeric', day: 'numeric' });

  // 1. 文章
  posts.forEach((post: CollectionEntry<'posts'>) => {
    items.push({
      id: `posts/${post.id}`,
      title: post.data.title,
      type: 'posts',
      category: post.data.category,
      url: `${SITE.url}/writing/${post.id}`,
      content: post.body || '',
      pubDate: fmtDate(post.data.pubDate),
      connections: post.data.connections || [],
    });
  });

  // 2. 笔记
  notes.forEach((note: CollectionEntry<'notes'>) => {
    items.push({
      id: `notes/${note.id}`,
      title: note.data.title,
      type: 'notes',
      category: '笔记',
      url: `${SITE.url}/notes/${note.id}`,
      content: note.body || '',
      pubDate: fmtDate(note.data.pubDate),
      connections: note.data.connections || [],
      stage: note.data.stage,
    });
  });

  // 3. 记忆
  memories.forEach((mem: CollectionEntry<'memories'>) => {
    items.push({
      id: `memories/${mem.id}`,
      title: mem.data.title,
      type: 'memories',
      category: mem.data.category,
      url: `${SITE.url}/memory/${mem.id}`,
      content: mem.body || '',
      pubDate: fmtDate(mem.data.pubDate),
      connections: mem.data.connections || [],
    });
  });

  // 4. 拾遗
  excerpts.forEach((exc: CollectionEntry<'excerpts'>) => {
    const title = `拾遗：${exc.data.author}${exc.data.source ? '《' + exc.data.source + '》' : ''}`;
    items.push({
      id: `excerpts/${exc.id}`,
      title: title,
      type: 'excerpts',
      category: '拾遗',
      url: `${SITE.url}/excerpts#${exc.id}`,
      content: `${exc.body || ''}\n\n[评注] ${exc.data.comment || ''}`,
      pubDate: fmtDate(exc.data.pubDate),
      connections: exc.data.connections || [],
    });
  });

  // 5. 念头
  fragments.forEach((frag: CollectionEntry<'fragments'>) => {
    const title = `念头 (${fmtDate(frag.data.pubDate)})`;
    items.push({
      id: `fragments/${frag.id}`,
      title: title,
      type: 'fragments',
      category: '念头',
      url: `${SITE.url}/fragments#${frag.id}`,
      content: frag.body || '',
      pubDate: fmtDate(frag.data.pubDate),
      connections: frag.data.connections || [],
    });
  });

  return new Response(JSON.stringify(items), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
