export function articleHref(id: string): string {
  return `/articles/${encodeURIComponent(id)}`;
}

export function articleIdFromPath(path: string): string | null {
  const match = path.match(/^\/articles\/([^/]+)\/?$/);
  if (!match) return null;
  try {
    const id = decodeURIComponent(match[1]);
    return id &&
      !/[/\\]/.test(id) &&
      Array.from(id).every((character) => character.charCodeAt(0) >= 32)
      ? id
      : null;
  } catch {
    return null;
  }
}
