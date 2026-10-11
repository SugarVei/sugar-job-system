import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from './Toast';
import { isPaletteColors } from '../lib/customPalette';
import { closePaletteStudio, isPaletteStudioRoute } from '../lib/paletteStudioRoute';
import '../styles/customPalette.css';

/** Keep the originating page mounted, preserving forms, filters, search, and scroll. */
export default function PaletteStudio() {
  const [open, setOpen] = useState(isPaletteStudioRoute);
  const { customPalette, applyCustomPalette } = useTheme();
  const toast = useToast();
  const frame = useRef<HTMLIFrameElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const update = () => setOpen(isPaletteStudioRoute());
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);
  useEffect(() => {
    if (!open) return;
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const content = document.querySelector<HTMLElement>('.app-fullscreen-root');
    const wasInert = content?.inert;
    if (content) content.inert = true;
    document.documentElement.classList.add('sugar-palette-editing');
    return () => {
      if (content) content.inert = wasInert ?? false;
      document.documentElement.classList.remove('sugar-palette-editing');
      previousFocus.current?.focus({ preventScroll: true });
    };
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const receive = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow) return;
      const data: unknown = event.data;
      if (!data || typeof data !== 'object' || !('type' in data)) return;
      if (data.type === 'sugar-palette:cancel') { closePaletteStudio(); return; }
      if (data.type === 'sugar-palette:apply' && 'colors' in data) {
        if (!isPaletteColors(data.colors)) { toast.error('配色无效，请选择五种有效颜色'); return; }
        applyCustomPalette(data.colors);
        closePaletteStudio();
        toast.success('自定义配色已应用，卡片与界面已重新着色');
      }
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, [open, applyCustomPalette, toast]);
  if (!open) return null;
  return createPortal(<section className="sugar-palette-studio" role="dialog" aria-modal="true" aria-label="自己设计颜色">
    <iframe ref={frame} src="/palette-studio.html" title="Sugar 自定义配色工作台" allow="clipboard-write"
      onLoad={() => {
        frame.current?.contentWindow?.postMessage({ type: 'sugar-palette:init', colors: customPalette?.colors ?? null }, window.location.origin);
        frame.current?.focus();
      }} />
  </section>, document.body);
}
