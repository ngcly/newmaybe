import { useState } from 'react';
import type { Asset } from '../types';

const ASSETS: Asset[] = [
  { title: '默认 OG 分享封面 (Default OG)', path: '/public/og-default.png', type: '图片' },
  { title: '品牌 Logo 矢量图 (Favicon SVG)', path: '/public/favicon.svg', type: '矢量图' },
  {
    title: '背景噪点 SVG 覆盖层 (Noise Pattern)',
    path: 'data:image/svg+xml;...',
    type: 'CSS图案',
  },
  {
    title: '水墨风诗歌背景水印 - 雨',
    path: 'src/content/posts/ (watermark: 雨)',
    type: '字符资产',
  },
  {
    title: '自托管中文书体 (Noto Serif SC)',
    path: 'node_modules/@fontsource/noto-serif-sc',
    type: '字体',
  },
  {
    title: '古典英文衬线体 (Cormorant Garamond)',
    path: 'node_modules/@fontsource/cormorant-garamond',
    type: '字体',
  },
];

export default function AssetGallery() {
  const [copiedAssetIdx, setCopiedAssetIdx] = useState<number | null>(null);

  const handleCopyAsset = (path: string, idx: number) => {
    void navigator.clipboard.writeText(path);
    setCopiedAssetIdx(idx);
    setTimeout(() => setCopiedAssetIdx(null), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-medium text-[var(--ink)]">共享素材资产画廊</h2>
        <p className="text-sm text-[var(--ink-soft)] mt-1">
          此处汇总了 newmaybe.com 各域名共享的核心媒体资产、图标与字体配置库。
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
        {ASSETS.map((asset, idx) => (
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
                  Active
                </span>
              </div>
              <h3 className="text-base font-semibold text-[var(--ink)] mb-2 font-serif">
                {asset.title}
              </h3>
              <code className="block bg-[var(--paper)] p-2 text-xs border border-[var(--line)] rounded text-[var(--ink-soft)] font-mono break-all">
                {asset.path}
              </code>
            </div>
            <div className="mt-4 pt-3 border-t border-[var(--line)] flex justify-end">
              <button
                onClick={() => handleCopyAsset(asset.path, idx)}
                className="bg-[var(--paper)] hover:bg-[var(--line)] border border-[var(--line)] text-[var(--ink-soft)] px-3 py-1.5 rounded text-xs transition-colors cursor-pointer"
              >
                {copiedAssetIdx === idx ? '已复制 ✔' : '复制引用代码'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
