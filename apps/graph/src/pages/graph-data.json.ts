import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

export const GET: APIRoute = async () => {
  const posts = await getCollection('posts', ({ data }) => !data.draft);
  const notes = await getCollection('notes', ({ data }) => !data.draft);
  const memories = await getCollection('memories', ({ data }) => !data.draft);
  const excerpts = await getCollection('excerpts', ({ data }) => !data.draft);
  const fragments = await getCollection('fragments', ({ data }) => !data.draft);

  const nodes: any[] = [];
  const links: any[] = [];

  const addNode = (id: string, title: string, group: string, url: string) => {
    if (!nodes.some(n => n.id === id)) {
      nodes.push({ id, title, group, url });
    }
  };

  const fmtDate = (d: Date) =>
    d.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });

  // 1. 添加文章节点
  posts.forEach(post => {
    addNode(`posts/${post.id}`, post.data.title, 'posts', `https://newmaybe.com/writing/${post.id}`);
    if (post.data.connections) {
      post.data.connections.forEach(conn => {
        links.push({ source: `posts/${post.id}`, target: conn });
      });
    }
  });

  // 2. 添加笔记节点
  notes.forEach(note => {
    addNode(`notes/${note.id}`, note.data.title, 'notes', `https://newmaybe.com/notes/${note.id}`);
    if (note.data.connections) {
      note.data.connections.forEach(conn => {
        links.push({ source: `notes/${note.id}`, target: conn });
      });
    }
  });

  // 3. 添加记忆节点
  memories.forEach(mem => {
    addNode(`memories/${mem.id}`, mem.data.title, 'memories', `https://newmaybe.com/memory/${mem.id}`);
    if (mem.data.connections) {
      mem.data.connections.forEach(conn => {
        links.push({ source: `memories/${mem.id}`, target: conn });
      });
    }
  });

  // 4. 添加拾遗节点
  excerpts.forEach(exc => {
    const title = `拾遗：${exc.data.author}${exc.data.source ? '《' + exc.data.source + '》' : ''}`;
    addNode(`excerpts/${exc.id}`, title, 'excerpts', `https://newmaybe.com/excerpts`);
    if (exc.data.connections) {
      exc.data.connections.forEach(conn => {
        links.push({ source: `excerpts/${exc.id}`, target: conn });
      });
    }
  });

  // 5. 添加念头节点
  fragments.forEach(frag => {
    const title = `念头 (${fmtDate(frag.data.pubDate)})`;
    addNode(`fragments/${frag.id}`, title, 'fragments', `https://newmaybe.com/fragments`);
    if (frag.data.connections) {
      frag.data.connections.forEach(conn => {
        links.push({ source: `fragments/${frag.id}`, target: conn });
      });
    }
  });

  // 过滤掉指向不存在节点的连线
  const nodeIds = new Set(nodes.map(n => n.id));
  const validLinks = links.filter(l => nodeIds.has(l.source) && nodeIds.has(l.target));

  return new Response(JSON.stringify({ nodes, links: validLinks }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*' // 允许主站或其他域跨域请求
    }
  });
};
