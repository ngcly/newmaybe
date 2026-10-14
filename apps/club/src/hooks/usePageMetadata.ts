import { useEffect } from 'react';
import type { Article } from '../types';
import { metadataValues, pageMetadata } from '../lib/page-metadata';

export function usePageMetadata(article: Article | null, path: string, status: number) {
  useEffect(() => {
    const metadata = pageMetadata(article, path, status);
    document.title = metadata.title;
    document.querySelector('link[rel="canonical"]')?.setAttribute('href', metadata.canonical);
    for (const [key, value] of Object.entries(metadataValues(metadata))) {
      document
        .querySelector(`meta[name="${key}"], meta[property="${key}"]`)
        ?.setAttribute('content', value);
    }
  }, [article, path, status]);
}
