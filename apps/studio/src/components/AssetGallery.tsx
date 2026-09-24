import { useState } from 'react';
import type { Asset } from '../types';

const NOISE_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180"><filter id="noise"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch"/></filter><rect width="100%" height="100%" filter="url(#noise)" opacity="0.08"/></svg>';
const mainAsset = (path: string) => `https://newmaybe.com/${path}`;

const ASSETS: Asset[] = [
  {
    title: '默认 OG 分享封面 (Default OG)',
    path: mainAsset('og-default.png'),
    type: '图片',
    kind: 'url',
    description: '主站发布的默认分享封面，可查看或复制完整图片地址。',
  },
  {
    title: '品牌 Logo 矢量图 (Favicon SVG)',
    path: mainAsset('favicon.svg'),
    type: '矢量图',
    kind: 'url',
    description: '主站发布的品牌图标，可在浏览器中打开并另存为 SVG。',
  },
  {
    title: '背景噪点 SVG 覆盖层 (Noise Pattern)',
    path: `background-image: url("data:image/svg+xml,${encodeURIComponent(NOISE_SVG)}");`,
    type: 'CSS图案',
    kind: 'code',
    description: '完整的 CSS 背景声明，粘贴到需要纸张纹理的元素样式中。',
  },
  {
    title: '水墨风诗歌背景水印 - 雨',
    path: 'watermark: 雨',
    type: '内容配置',
    kind: 'code',
    description: '加入诗歌文章的 YAML frontmatter，文章位于 packages/content/posts/。',
  },
  {
    title: '自托管中文书体 (Noto Serif SC)',
    path: 'font-family: var(--serif-cn);',
    type: '字体样式',
    kind: 'code',
    description: '适用于已加载站点共享字体和设计 Token 的页面。',
  },
  {
    title: '古典英文衬线体 (Cormorant Garamond)',
    path: 'font-family: var(--serif-en);',
    type: '字体样式',
    kind: 'code',
    description: '适用于已加载站点共享字体和设计 Token 的页面。',
  },
];

export default function AssetGallery({
  resolveSubdomain,
}: {
  resolveSubdomain: (url: string) => string;
}) {
  const assets = ASSETS.map((asset) => ({
    ...asset,
    path: asset.kind === 'url' ? resolveSubdomain(asset.path) : asset.path,
  }));
  const [copiedAssetIdx, setCopiedAssetIdx] = useState<number | null>(null);

  const [copyError, setCopyError] = useState('');
  const handleCopyAsset = async (path: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(path);
      setCopyError('');
      setCopiedAssetIdx(idx);
      setTimeout(() => setCopiedAssetIdx(null), 2000);
    } catch {
      setCopyError('复制失败，请手动选择并复制下方内容。');
    }
  };

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-medium text-[var(--ink)]">共享素材资产画廊</h2>
        <p className="text-sm text-[var(--ink-soft)] mt-1">
          此处汇总了 newmaybe.com 各域名共享的核心媒体资产、图标与字体配置库。
        </p>
      </div>

      {copyError && <p role="alert">{copyError}</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
        {assets.map((asset, idx) => (
          <div
            key={idx}
            className="bg-[var(--paper-deep)] border border-[var(--line)] rounded p-5 flex flex-col justify-between shadow-sm"
          >
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-serif text-[var(--ochre)] italic font-semibold">
                  {asset.type}
                </span>
                <span className="text-[10px] bg-[var(--paper)] text-[var(--ink-faint)] px-2 py-0.5 rounded border border-[var(--line)]">
                  {asset.kind === 'url' ? '公共素材' : '使用片段'}
                </span>
              </div>
              <h3 className="text-base font-semibold text-[var(--ink)] mb-2 font-serif">
                {asset.title}
              </h3>
              <p className="mb-3 text-xs text-[var(--ink-soft)]">{asset.description}</p>
              <code className="block bg-[var(--paper)] p-2 text-xs border border-[var(--line)] rounded text-[var(--ink-soft)] font-mono break-all">
                {asset.path}
              </code>
            </div>
            <div className="mt-4 pt-3 border-t border-[var(--line)] flex justify-end items-center gap-3">
              {asset.kind === 'url' && (
                <a
                  href={asset.path}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-[var(--ochre)]"
                >
                  查看素材
                </a>
              )}
              <button
                onClick={() => handleCopyAsset(asset.path, idx)}
                className="bg-[var(--paper)] hover:bg-[var(--line)] border border-[var(--line)] text-[var(--ink-soft)] px-3 py-1.5 rounded text-xs transition-colors cursor-pointer"
              >
                {copiedAssetIdx === idx
                  ? '已复制 ✔'
                  : asset.kind === 'url'
                    ? '复制素材地址'
                    : '复制使用片段'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
