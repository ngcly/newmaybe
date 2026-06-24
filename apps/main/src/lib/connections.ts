import { getEntry } from 'astro:content';

/**
 * 编译期解析 connections 字符串数组为具体的 Astro Content Entry 实体
 * @param connections 格式为 ['notes/slug-a', 'posts/slug-b']
 */
export async function resolveConnections(connections?: string[]) {
  if (!connections || connections.length === 0) return [];
  
  const resolved = await Promise.all(
    connections.map(async (connStr) => {
      const parts = connStr.split('/');
      if (parts.length < 2) return null;
      
      const collection = parts[0] as any;
      const id = parts.slice(1).join('/');
      
      try {
        const entry = await getEntry(collection, id);
        return entry ? { collection, ...entry } : null;
      } catch (e) {
        console.warn(`Failed to resolve connection: ${connStr}`, e);
        return null;
      }
    })
  );
  
  return resolved.filter(Boolean) as any[];
}
