import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

export const GET: APIRoute = async () => {
  const posts = await getCollection('posts', ({ data }) => !data.draft);
  const notes = await getCollection('notes', ({ data }) => !data.draft);
  const memories = await getCollection('memories', ({ data }) => !data.draft);
  const excerpts = await getCollection('excerpts', ({ data }) => !data.draft);
  const fragments = await getCollection('fragments', ({ data }) => !data.draft);

  const items: any[] = [];

  const fmtDate = (d: Date) =>
    d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'numeric', day: 'numeric' });

  // 1. 文章
  posts.forEach(post => {
    items.push({
      id: `posts/${post.id}`,
      title: post.data.title,
      type: 'posts',
      category: post.data.category,
      url: `https://newmaybe.com/writing/${post.id}`,
      content: post.body || '',
      pubDate: fmtDate(post.data.pubDate)
    });
  });

  // 2. 笔记
  notes.forEach(note => {
    items.push({
      id: `notes/${note.id}`,
      title: note.data.title,
      type: 'notes',
      category: '笔记',
      url: `https://newmaybe.com/notes/${note.id}`,
      content: note.body || '',
      pubDate: fmtDate(note.data.pubDate)
    });
  });

  // 3. 记忆
  memories.forEach(mem => {
    items.push({
      id: `memories/${mem.id}`,
      title: mem.data.title,
      type: 'memories',
      category: mem.data.category,
      url: `https://newmaybe.com/memory/${mem.id}`,
      content: mem.body || '',
      pubDate: fmtDate(mem.data.pubDate)
    });
  });

  // 4. 拾遗
  excerpts.forEach(exc => {
    const title = `拾遗：${exc.data.author}${exc.data.source ? '《' + exc.data.source + '》' : ''}`;
    items.push({
      id: `excerpts/${exc.id}`,
      title: title,
      type: 'excerpts',
      category: '拾遗',
      url: `https://newmaybe.com/excerpts#${exc.id}`,
      content: `${exc.body || ''}\n\n[评注] ${exc.data.comment || ''}`,
      pubDate: fmtDate(exc.data.pubDate)
    });
  });

  // 5. 念头
  fragments.forEach(frag => {
    const title = `念头 (${fmtDate(frag.data.pubDate)})`;
    items.push({
      id: `fragments/${frag.id}`,
      title: title,
      type: 'fragments',
      category: '念头',
      url: `https://newmaybe.com/fragments#${frag.id}`,
      content: frag.body || '',
      pubDate: fmtDate(frag.data.pubDate)
    });
  });

  return new Response(JSON.stringify(items), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=3600'
    }
  });
};
