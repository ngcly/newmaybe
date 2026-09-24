export interface DraftSaveStatus {
  saved: boolean;
  message: string;
}

export const INITIAL_SAVE_STATUS: DraftSaveStatus = {
  saved: false,
  message: '编辑后自动暂存',
};

export function loadDraft<T>(
  key: string,
  fallback: T,
  parse: (value: string) => T = JSON.parse,
): T {
  try {
    const saved = localStorage.getItem(key);
    return saved === null ? fallback : parse(saved);
  } catch {
    return fallback;
  }
}

export function saveDraft<T>(
  key: string,
  value: T,
  serialize: (value: T) => string = JSON.stringify,
): DraftSaveStatus {
  try {
    localStorage.setItem(key, serialize(value));
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return { saved: true, message: `已暂存 ${time}` };
  } catch {
    return { saved: false, message: '暂存失败，内容仍保留在当前页面；请复制或导出后再关闭。' };
  }
}
