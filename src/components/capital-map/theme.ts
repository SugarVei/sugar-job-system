export const MAP_COLORS = {
  page: 'rgba(255,253,248,0.72)',
  panel: '#fffdf8',
  ink: '#1b1a17',
  muted: '#8a8478',
  line: '#e0d8c9',
  area: '#f3eee4',
  areaHover: '#ebe4d6',
  selectedArea: '#f3d7b0',
  selectedStroke: '#d4b48a',
  selectedDot: '#f4c84a',
  label: '#1b1a17',
  labelHalo: '#fffdf8',
  chip: '#faf6f0',
  chipActive: '#f8ead4',
  dots: ['#8ca6c7', '#7eb8a0', '#e4a08c', '#d4b48a'] as const,
};

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
