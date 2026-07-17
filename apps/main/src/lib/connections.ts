import type { CollectionEntry } from 'astro:content';
import { getEntry } from 'astro:content';

type ConnectionCollection = 'posts' | 'notes' | 'memories' | 'fragments' | 'excerpts';

export type ResolvedConnection =
  | CollectionEntry<'posts'>
  | CollectionEntry<'notes'>
  | CollectionEntry<'memories'>
  | CollectionEntry<'fragments'>
  | CollectionEntry<'excerpts'>;

export const COLL_LABEL: Record<ConnectionCollection, string> = {
  posts: '文字',
  notes: '笔记',
  memories: '概念',
  fragments: '念头',
  excerpts: '拾遗',
};

export function connUrl(conn: ResolvedConnection): string {
  switch (conn.collection) {
    case 'posts':
      return `/writing/${conn.id}`;
    case 'notes':
      return `/notes/${conn.id}`;
    case 'memories':
      return `/memory/${conn.id}`;
    case 'fragments':
      return `/fragments#${conn.id}`;
    case 'excerpts':
      return `/excerpts#${conn.id}`;
    default:
      return '';
  }
}

export function connTitle(conn: ResolvedConnection): string {
  switch (conn.collection) {
    case 'posts':
    case 'notes':
    case 'memories':
      return conn.data.title;
    case 'fragments':
      return `念头 · ${conn.data.pubDate.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' })}`;
    case 'excerpts': {
      const src = conn.data.source;
      return `${conn.data.author}${src ? `·《${src}》` : ''}`;
    }
    default:
      return '';
  }
}

async function resolveOne(connStr: string): Promise<ResolvedConnection | null> {
  const slash = connStr.indexOf('/');
  if (slash === -1) {
    console.warn(`Invalid connection format (expected "collection/id"): ${connStr}`);
    return null;
  }
  const col = connStr.slice(0, slash);
  const id = connStr.slice(slash + 1);
  try {
    switch (col) {
      case 'posts':
        return (await getEntry('posts', id)) ?? null;
      case 'notes':
        return (await getEntry('notes', id)) ?? null;
      case 'memories':
        return (await getEntry('memories', id)) ?? null;
      case 'fragments':
        return (await getEntry('fragments', id)) ?? null;
      case 'excerpts':
        return (await getEntry('excerpts', id)) ?? null;
      default:
        console.warn(`Unknown collection in connection: ${connStr}`);
        return null;
    }
  } catch (e) {
    console.warn(`Failed to resolve connection: ${connStr}`, e);
    return null;
  }
}

export async function resolveConnections(connections?: string[]): Promise<ResolvedConnection[]> {
  if (!connections || connections.length === 0) return [];
  const resolved = await Promise.all(connections.map(resolveOne));
  return resolved.filter((r: ResolvedConnection | null): r is ResolvedConnection => r !== null);
}
