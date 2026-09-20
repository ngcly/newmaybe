import { Routes, Route } from 'react-router';
import { lazy, Suspense } from 'react';
import SiteLayout from './components/SiteLayout';
import Home from './pages/Home';
const Books = lazy(() => import('./pages/Books'));
const BookDetail = lazy(() => import('./pages/BookDetail'));
const Reader = lazy(() => import('./pages/Reader'));
const PathPage = lazy(() => import('./pages/PathPage'));
const Practice = lazy(() => import('./pages/Practice'));
const Tools = lazy(() => import('./pages/Tools'));

export default function App() {
  return (
    <Suspense
      fallback={
        <p role="status" className="p-8 text-center">
          正在加载书房…
        </p>
      }
    >
      <Routes>
        <Route element={<SiteLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/books" element={<Books />} />
          <Route path="/book/:bookId" element={<BookDetail />} />
          <Route path="/book/:bookId/read/:n" element={<Reader />} />
          <Route path="/path" element={<PathPage />} />
          <Route path="/practice" element={<Practice />} />
          <Route path="/tools" element={<Tools />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
