import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getCollection, type CollectionEntry } from 'astro:content';
import { SITE } from '../config';

export async function GET(context: APIContext) {
  const posts = (
    await getCollection('posts', ({ data }: CollectionEntry<'posts'>) => !data.draft)
  ).sort(
    (a: CollectionEntry<'posts'>, b: CollectionEntry<'posts'>) =>
      b.data.pubDate.valueOf() - a.data.pubDate.valueOf(),
  );

  return rss({
    title: `${SITE.title} — ${SITE.tagline}`,
    description: SITE.description,
    site: context.site!,
    items: posts.map((post: CollectionEntry<'posts'>) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      categories: [post.data.category],
      link: `/writing/${post.id}/`,
    })),
    customData: `<language>${SITE.locale}</language>`,
  });
}
