import { useState, useEffect } from 'react';
import { resolveSubdomain as _resolveSubdomain } from '@newmaybe/content/utils';
import type { Tab } from './types';
import Sidebar from './components/Sidebar';
import PosterGenerator from './components/PosterGenerator';
import InspirationEngine from './components/InspirationEngine';
import AssetGallery from './components/AssetGallery';
import CardExporter from './components/CardExporter';
import TextFormatter from './components/TextFormatter';

const _isDev =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const resolveSubdomain = (url: string) => _resolveSubdomain(url, _isDev);

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    if (typeof window === 'undefined') return 'poster';
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab') as Tab | null;
    if (tabParam && ['poster', 'card', 'formatter', 'inspiration', 'assets'].includes(tabParam)) {
      return tabParam;
    }
    if (params.get('content')) return 'card';
    return 'poster';
  });

  const [initialQuote] = useState<string | undefined>(() => {
    if (typeof window === 'undefined') return undefined;
    return new URLSearchParams(window.location.search).get('quote') || undefined;
  });

  const [initialCardContent] = useState<string | undefined>(() => {
    if (typeof window === 'undefined') return undefined;
    return new URLSearchParams(window.location.search).get('content') || undefined;
  });

  // Clean URL query params after reading initial values on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hasParams = params.has('quote') || params.has('content') || params.has('tab');
    if (hasParams) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[var(--paper)]">
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        resolveSubdomain={resolveSubdomain}
      />

      <main className="flex-grow p-6 md:p-12 overflow-y-auto">
        {activeTab === 'poster' && <PosterGenerator initialQuote={initialQuote} />}
        {activeTab === 'card' && <CardExporter initialContent={initialCardContent} />}
        {activeTab === 'formatter' && <TextFormatter />}
        {activeTab === 'inspiration' && <InspirationEngine resolveSubdomain={resolveSubdomain} />}
        {activeTab === 'assets' && <AssetGallery />}
      </main>
    </div>
  );
}
