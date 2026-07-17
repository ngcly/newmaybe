import { useState, useEffect } from 'react';
import { resolveSubdomain as _resolveSubdomain } from '@newmaybe/content/utils';
import type { Tab } from './types';
import Sidebar from './components/Sidebar';
import PosterGenerator from './components/PosterGenerator';
import InspirationEngine from './components/InspirationEngine';
import AssetGallery from './components/AssetGallery';

const _isDev =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const resolveSubdomain = (url: string) => _resolveSubdomain(url, _isDev);

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('poster');
  const [initialQuote, setInitialQuote] = useState<string | undefined>();

  // Accept ?quote= from AI domain cross-linking
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const quoteParam = params.get('quote');
    if (quoteParam) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setInitialQuote(quoteParam);

      setActiveTab('poster');
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
        {activeTab === 'inspiration' && <InspirationEngine resolveSubdomain={resolveSubdomain} />}
        {activeTab === 'assets' && <AssetGallery />}
      </main>
    </div>
  );
}
