import { useState, useEffect } from 'react';
import { resolveSubdomain as _resolveSubdomain } from '@newmaybe/content/utils';
import type { Tab } from './types';
import Sidebar from './components/Sidebar';
import TextFormatter from './components/TextFormatter';
import CardExporter from './components/CardExporter';

const _isDev =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const resolveSubdomain = (url: string) => _resolveSubdomain(url, _isDev);

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('formatter');
  const [exporterContent, setExporterContent] = useState<string | undefined>();

  // Accept ?content= from AI domain cross-linking
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const contentParam = params.get('content');
    if (contentParam) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setExporterContent(contentParam);

      setActiveTab('exporter');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        resolveSubdomain={resolveSubdomain}
      />

      <main className="flex-grow p-6 md:p-12 overflow-y-auto">
        {activeTab === 'formatter' && <TextFormatter />}
        {activeTab === 'exporter' && <CardExporter initialContent={exporterContent} />}
      </main>
    </div>
  );
}
