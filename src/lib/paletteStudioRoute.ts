const STUDIO_HASH = '#/palette-studio';
const RETURN_KEY = 'sugar.palette.return-hash';
export const isPaletteStudioRoute = () => window.location.hash === STUDIO_HASH;
export function openPaletteStudio() {
  if (isPaletteStudioRoute()) return;
  try { sessionStorage.setItem(RETURN_KEY, window.location.hash); } catch { /* unavailable storage */ }
  window.history.pushState({ ...window.history.state, sugarPaletteEntry: true }, '', STUDIO_HASH);
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}
export function closePaletteStudio() {
  if (window.history.state?.sugarPaletteEntry) { window.history.back(); return; }
  let hash = '';
  try { hash = sessionStorage.getItem(RETURN_KEY) ?? ''; } catch { /* unavailable storage */ }
  if (!hash.startsWith('#') || hash === STUDIO_HASH) hash = '';
  window.history.replaceState(null, '', window.location.pathname + window.location.search + hash);
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}
