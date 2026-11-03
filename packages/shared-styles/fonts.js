/* global process, URL */
// 全站共用字体：由主站发布在 /fonts/<版本>/，七个站点引用同一份样式表，浏览器缓存在各子域名间共用。
// 字体有改动（换字体、增删字重、升级 Fontsource）时提升 FONT_VERSION，先部署主站，再部署其他站点。
// 纯 JS（非 TS）：Vite 与 Astro 的配置会把工作区包当作外部依赖，直接由 Node 加载。

export const FONT_VERSION = 'v1';
export const FONT_STYLESHEET_PATH = `/fonts/${FONT_VERSION}/fonts.css`;

const PRODUCTION_ORIGIN = 'https://newmaybe.com';
// 与 @newmaybe/content 的 resolveSubdomain 一致：主站开发服务器在 4321 端口
const DEVELOPMENT_ORIGIN = 'http://localhost:4321';

/**
 * 其他站点引用的样式表地址。构建时可用 NEWMAYBE_FONTS_ORIGIN 指向别的主站地址（本地验证、预发环境）。
 * @param {{ dev?: boolean }} [options]
 */
export function fontStylesheetUrl({ dev = false } = {}) {
  const override = typeof process === 'undefined' ? undefined : process.env.NEWMAYBE_FONTS_ORIGIN;
  const origin = override || (dev ? DEVELOPMENT_ORIGIN : PRODUCTION_ORIGIN);
  return origin.replace(/\/$/, '') + FONT_STYLESHEET_PATH;
}

/** Vite 插件：给 React 子站的 index.html 注入共用字体样式表。 */
export function sharedFonts() {
  let href = '';
  return {
    name: 'newmaybe:shared-fonts',
    configResolved(config) {
      href = fontStylesheetUrl({ dev: config.command === 'serve' });
    },
    transformIndexHtml() {
      return [
        // 字体是跨域 CORS 请求，预连接要带 crossorigin 才能复用
        {
          tag: 'link',
          attrs: { rel: 'preconnect', href: new URL(href).origin, crossorigin: true },
          injectTo: 'head',
        },
        // 以 CORS 方式请求样式表，响应可被 Service Worker 缓存，供离线阅读使用
        { tag: 'link', attrs: { rel: 'stylesheet', href, crossorigin: true }, injectTo: 'head' },
      ];
    },
  };
}
