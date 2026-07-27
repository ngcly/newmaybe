import { Routes, Route } from 'react-router';
import SiteLayout from './components/SiteLayout';
import Home from './pages/Home';
import Books from './pages/Books';
import BookDetail from './pages/BookDetail';
import Reader from './pages/Reader';
import PathPage from './pages/PathPage';
import Practice from './pages/Practice';
import Tools from './pages/Tools';

export default function App() {
  return (
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
  );
}
