import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { syncBrowserTheme } from '@newmaybe/design-tokens/browser-theme';

syncBrowserTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
