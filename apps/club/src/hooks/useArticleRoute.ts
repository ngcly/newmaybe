import { useEffect, useState } from 'react';
import { articleHref, articleIdFromPath } from '../lib/article-url';

export function useArticleRoute() {
  const [path, setPath] = useState(() => window.location.pathname);
  useEffect(() => {
    const sync = () => setPath(window.location.pathname);
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);
  const navigate = (id: string | null) => {
    const next = id ? articleHref(id) : '/';
    if (window.location.pathname !== next || window.location.hash || window.location.search) {
      window.history.pushState(null, '', next);
    }
    setPath(next);
  };
  const articleId = articleIdFromPath(path);
  return { articleId, invalidPath: path !== '/' && !articleId, navigate, path };
}
