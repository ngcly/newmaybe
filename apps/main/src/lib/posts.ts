import type { CollectionEntry } from 'astro:content';

type Post = CollectionEntry<'posts'>;

export function comparePostsForDisplay(a: Post, b: Post) {
  const weightDiff = b.data.weight - a.data.weight;
  if (weightDiff !== 0) return weightDiff;

  const dateDiff = b.data.pubDate.valueOf() - a.data.pubDate.valueOf();
  if (dateDiff !== 0) return dateDiff;

  return a.data.title.localeCompare(b.data.title, 'zh-CN');
}

export function sortPostsForDisplay(posts: Post[]) {
  return [...posts].sort(comparePostsForDisplay);
}
