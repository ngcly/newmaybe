const SAFE_SLUG = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/;

export function assertSafeSlug(value: string): string {
  if (!SAFE_SLUG.test(value)) {
    throw new Error('slug 只能包含小写英文字母、数字、连字符和下划线');
  }
  return value;
}

/** JSON strings and arrays are valid YAML and safely preserve user input. */
export function yamlValue(value: string | string[]): string {
  return JSON.stringify(value);
}

export function localIsoDate(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
