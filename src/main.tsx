import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/tokens.css';
import './index.css';
import './styles/interactionMotion.css';

// 新版本上线后，旧页面里的分块文件会失效；加载失败时刷新一次以取得最新版本。
window.addEventListener('vite:preloadError', (event) => {
  const key = 'sugar.chunk-reload-at';
  try {
    if (Date.now() - Number(sessionStorage.getItem(key) ?? 0) < 10_000) return;
    sessionStorage.setItem(key, String(Date.now()));
  } catch {
    return;
  }
  event.preventDefault();
  window.location.reload();
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
