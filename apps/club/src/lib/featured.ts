import catalog from '../../featured/catalog.json';

export interface FeaturedIssue {
  slug: string;
  number: string;
  title: string;
  author: string;
  description: string;
  publishedAt: string;
  /** Exactly one source: a reviewed club manuscript or a published main-site post. */
  articleId?: string;
  sourcePost?: string;
  articleRevision: string;
  status: 'draft' | 'published';
  /** Relative to this issue's directory. */
  cover?: string;
}

export interface FeaturedCatalog {
  currentIssue: string | null;
  issues: FeaturedIssue[];
}

// The build validates the JSON before emitting any public pages or assets.
export const featuredCatalog = catalog as FeaturedCatalog;
export const featuredHref = (slug: string) => `/featured/${slug}`;
/** Shared fonts live in a folder named after package versions and a content hash: never stale. */
export const featuredFontPath =
  /^\/featured\/common\/fonts\/[\w.-]+\/(?:fonts\.css|[\w-]+\.woff2)$/;
export const featuredAssetHref = (slug: string, file: string) =>
  `/featured/${slug}/${file.split('/').map(encodeURIComponent).join('/')}`;

export function publishedIssues(source: FeaturedCatalog = featuredCatalog): FeaturedIssue[] {
  return source.issues
    .filter((issue) => issue.status === 'published')
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt) || b.slug.localeCompare(a.slug));
}

export function currentIssue(source: FeaturedCatalog = featuredCatalog): FeaturedIssue | null {
  return publishedIssues(source).find((issue) => issue.slug === source.currentIssue) || null;
}

/** Decide before asset lookup, so drafts and unknown issues never receive the SPA shell. */
export function isPublishedFeaturedPath(path: string, source = featuredCatalog): boolean {
  if (path === '/featured' || path === '/featured/archive') return true;
  return publishedIssues(source).some(
    ({ slug }) => path === featuredHref(slug) || path.startsWith(`${featuredHref(slug)}/`),
  );
}
