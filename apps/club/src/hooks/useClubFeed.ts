import { useEffect, useRef, useState, type RefObject } from 'react';
import { ClubAPI, getLocalArticles } from '../lib/api';
import { summarizeArticle, type ArticleSummary, type FeedStats } from '../types';

export function useClubFeed(
  query: string,
  syncVersion: number,
  mutationVersion: RefObject<number>,
) {
  const [articles, setArticles] = useState<ArticleSummary[]>(getLocalArticles);
  const [stats, setStats] = useState<FeedStats>();
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [page, setPage] = useState({ query, offset: 0, attempt: 0 });
  if (page.query !== query) setPage({ query, offset: 0, attempt: 0 });
  const offset = page.query === query ? page.offset : 0;
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const snapshot = useRef<{
    query: string;
    syncVersion: number;
    articles: ArticleSummary[];
    nextOffset: number | null;
  } | null>(null);
  useEffect(() => {
    let active = true;
    const version = mutationVersion.current;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    const params = new URLSearchParams(query);
    const previous = snapshot.current;
    const append =
      offset > 0 &&
      previous?.query === query &&
      previous.syncVersion === syncVersion &&
      previous.nextOffset === offset;
    const load = async () => {
      const loaded = append ? [...previous.articles] : [];
      let next: number | null = append ? offset : 0;
      let lastStats: FeedStats | undefined;
      // Mutations refresh the loaded prefix; loading more only fetches the next page.
      while (next !== null && next <= offset) {
        params.set('offset', String(next));
        params.set('limit', '20');
        const result = await ClubAPI.fetchArticles(params);
        if (!active || mutationVersion.current !== version) return;
        if (result.offline) {
          if (previous?.query !== query) {
            setArticles(result.articles);
            setStats(undefined);
            setNextOffset(null);
          }
          setOffline(true);
          setLoading(false);
          return;
        }
        loaded.push(...result.articles);
        const current: number = next;
        next = result.nextOffset !== null && result.nextOffset > current ? result.nextOffset : null;
        lastStats = result.stats;
      }
      const unique = [...new Map(loaded.map((article) => [article.id, article])).values()];
      snapshot.current = { query, syncVersion, articles: unique, nextOffset: next };
      setArticles(unique);
      setStats(lastStats);
      setNextOffset(next);
      setOffline(false);
      setLoading(false);
    };
    void load();
    return () => {
      active = false;
    };
  }, [query, offset, page.attempt, syncVersion, mutationVersion]);
  useEffect(() => {
    try {
      localStorage.setItem(
        'newmaybe_club_articles',
        JSON.stringify(articles.slice(0, 100).map(summarizeArticle)),
      );
    } catch {
      /* Cache is optional; drafts have their own save feedback. */
    }
  }, [articles]);
  return {
    articles,
    setArticles,
    stats,
    loading,
    offline,
    nextOffset,
    loadMore: () => {
      if (nextOffset !== null)
        setPage((current) => ({ query, offset: nextOffset, attempt: current.attempt + 1 }));
    },
  };
}
