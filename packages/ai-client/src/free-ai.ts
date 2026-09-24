interface Turnstile {
  render: (container: HTMLElement, options: Record<string, unknown>) => string;
  remove: (id: string) => void;
}
type ChallengeWindow = Window & { turnstile?: Turnstile };
let scriptPromise: Promise<Turnstile> | undefined;

function loadTurnstile(): Promise<Turnstile> {
  const api = (window as ChallengeWindow).turnstile;
  if (api) return Promise.resolve(api);
  if (!scriptPromise) {
    scriptPromise = new Promise<Turnstile>((resolve, reject) => {
      const script = document.createElement('script');
      const timer = window.setTimeout(() => fail(), 15_000);
      const fail = () => {
        clearTimeout(timer);
        script.remove();
        reject(new Error('验证组件加载失败，请重试。'));
      };
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.onload = () => {
        clearTimeout(timer);
        const ready = (window as ChallengeWindow).turnstile;
        if (ready) resolve(ready);
        else fail();
      };
      script.onerror = fail;
      document.head.appendChild(script);
    }).catch((error) => {
      scriptPromise = undefined;
      throw error;
    });
  }
  return scriptPromise;
}

async function challenge(sitekey: string, signal?: AbortSignal | null): Promise<string> {
  const api = await loadTurnstile();
  signal?.throwIfAborted();
  return new Promise((resolve, reject) => {
    const dialog = document.createElement('dialog');
    dialog.setAttribute('aria-label', '免费 AI 使用验证');
    dialog.style.cssText =
      'padding:24px;border:1px solid var(--line);border-radius:8px;background:var(--paper);color:var(--ink);max-width:calc(100vw - 32px)';
    const title = document.createElement('p');
    title.textContent = '请完成验证后继续使用免费 AI';
    const container = document.createElement('div');
    const cancel = document.createElement('button');
    cancel.textContent = '取消';
    cancel.type = 'button';
    dialog.append(title, container, cancel);
    document.body.appendChild(dialog);
    let widget: string | undefined;
    let settled = false;
    const cleanup = () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      if (widget) api.remove(widget);
      dialog.close();
      dialog.remove();
    };
    const finish = (token?: string, aborted = false) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (token) resolve(token);
      else reject(aborted ? signal?.reason : new Error('验证未完成，请重试。'));
    };
    const onAbort = () => finish(undefined, true);
    const timer = window.setTimeout(() => finish(), 120_000);
    signal?.addEventListener('abort', onAbort, { once: true });
    cancel.onclick = () => finish();
    dialog.addEventListener('cancel', (event) => {
      event.preventDefault();
      finish();
    });
    dialog.showModal();
    try {
      widget = api.render(container, {
        sitekey,
        action: 'free_ai',
        theme: 'auto',
        callback: (token: string) => finish(token),
        'error-callback': () => finish(),
        'expired-callback': () => finish(),
      });
      if (settled) api.remove(widget);
    } catch {
      finish();
    }
  });
}

/** Shared free channel; provider-owned requests never use this challenge or endpoint. */
export async function fetchFreeAI(endpoint: string, init: RequestInit): Promise<Response> {
  init.signal?.throwIfAborted();
  const url = new URL(endpoint, window.location.href);
  const configResponse = await fetch(new URL('/api/security', url), {
    signal: AbortSignal.any([AbortSignal.timeout(15_000), ...(init.signal ? [init.signal] : [])]),
  });
  if (!configResponse.ok) throw new Error('免费 AI 服务尚未就绪，请稍后重试。');
  const config = (await configResponse.json()) as { required?: boolean; siteKey?: string };
  const headers = new Headers(init.headers);
  if (config.required !== false) {
    if (!config.siteKey) throw new Error('免费 AI 服务尚未就绪，请稍后重试。');
    headers.set('X-Turnstile-Token', await challenge(config.siteKey, init.signal));
  }
  init.signal?.throwIfAborted();
  return fetch(url, { ...init, headers });
}
