import { lazy, Suspense } from 'react';
import App from './App';

const AuthorWorkspace = lazy(() => import('./components/AuthorWorkspace'));

export default function AppRouter() {
  return ['/me', '/admin'].includes(window.location.pathname) ? (
    <Suspense fallback={<p role="status">正在打开写作空间…</p>}>
      <AuthorWorkspace />
    </Suspense>
  ) : (
    <App />
  );
}
