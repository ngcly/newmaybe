import type { APIRoute } from 'astro';
import { getCollection, type CollectionEntry } from 'astro:content';

interface GraphNode {
  id: string;
  title: string;
  group: string;
  url: string;
}

interface GraphLink {
  source: string;
  target: string;
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

  const isDev = import.meta.env.DEV;
  const mainSiteUrl = isDev ? 'http://localhost:4321' : 'https://newmaybe.com';

  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];

  const addNode = (id: string, title: string, group: string, url: string) => {
    if (!nodes.some((n) => n.id === id)) {
      nodes.push({ id, title, group, url });
    }
  };

  const fmtDate = (d: Date) => d.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });

  // 1. 添加文章节点
  posts.forEach((post: CollectionEntry<'posts'>) => {
    addNode(`posts/${post.id}`, post.data.title, 'posts', `${mainSiteUrl}/writing/${post.id}`);
    if (post.data.connections) {
      post.data.connections.forEach((conn: string) => {
        links.push({ source: `posts/${post.id}`, target: conn });
      });
    }
  });

  // 2. 添加笔记节点
  notes.forEach((note: CollectionEntry<'notes'>) => {
    addNode(`notes/${note.id}`, note.data.title, 'notes', `${mainSiteUrl}/notes/${note.id}`);
    if (note.data.connections) {
      note.data.connections.forEach((conn: string) => {
        links.push({ source: `notes/${note.id}`, target: conn });
      });
    }
  });

  // 3. 添加记忆节点
  memories.forEach((mem: CollectionEntry<'memories'>) => {
    addNode(`memories/${mem.id}`, mem.data.title, 'memories', `${mainSiteUrl}/memory/${mem.id}`);
    if (mem.data.connections) {
      mem.data.connections.forEach((conn: string) => {
        links.push({ source: `memories/${mem.id}`, target: conn });
      });
    }
  });

  // 4. 添加拾遗节点
  excerpts.forEach((exc: CollectionEntry<'excerpts'>) => {
    const title = `拾遗：${exc.data.author}${exc.data.source ? '《' + exc.data.source + '》' : ''}`;
    addNode(`excerpts/${exc.id}`, title, 'excerpts', `${mainSiteUrl}/excerpts#${exc.id}`);
    if (exc.data.connections) {
      exc.data.connections.forEach((conn: string) => {
        links.push({ source: `excerpts/${exc.id}`, target: conn });
      });
    }
  });

  // 5. 添加念头节点
  fragments.forEach((frag: CollectionEntry<'fragments'>) => {
    const title = `念头 (${fmtDate(frag.data.pubDate)})`;
    addNode(`fragments/${frag.id}`, title, 'fragments', `${mainSiteUrl}/fragments#${frag.id}`);
    if (frag.data.connections) {
      frag.data.connections.forEach((conn: string) => {
        links.push({ source: `fragments/${frag.id}`, target: conn });
      });
    }
  });

  // 过滤掉指向不存在节点的连线
  const nodeIds = new Set(nodes.map((n) => n.id));
  const validLinks = links.filter((l) => nodeIds.has(l.source) && nodeIds.has(l.target));

  return new Response(JSON.stringify({ nodes, links: validLinks }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
};
