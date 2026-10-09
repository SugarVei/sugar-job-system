export const CATEGORIES = [
  ['all', '全部'], ['seating', '座椅'], ['tables', '桌台'], ['beds', '床'], ['storage', '收纳'], ['decor', '装饰'], ['placed', '已放置'],
];
export const CATALOG = [
  { kind: 'sofa', name: '三人沙发', category: 'seating', w: 3.2, d: 1.2, tintable: true },
  { kind: 'loveseat', name: '双人沙发', category: 'seating', w: 2.2, d: 1.2, tintable: true },
  { kind: 'armchair', name: '休闲单椅', category: 'seating', w: .95, d: .95, tintable: true },
  { kind: 'chair', name: '办公椅', category: 'seating', w: .95, d: .95, tintable: true },
  { kind: 'stool', name: '圆形坐凳', category: 'seating', w: .65, d: .65, tintable: true },
  { kind: 'desk', name: '窗边书桌', category: 'tables', w: 4.25, d: 1.18 },
  { kind: 'coffee', name: '圆形茶几', category: 'tables', w: 1.54, d: 1.54 },
  { kind: 'side', name: '木质边几', category: 'tables', w: .67, d: .67 },
  { kind: 'dining', name: '方形餐桌', category: 'tables', w: 1.7, d: 1.25 },
  { kind: 'bed', name: '舒适双人床', category: 'beds', w: 2.96, d: 3.92, tintable: true },
  { kind: 'single-bed', name: '轻巧单人床', category: 'beds', w: 1.65, d: 3.8, tintable: true },
  { kind: 'shelf', name: '开放书架', category: 'storage', w: 1.3, d: .68 },
  { kind: 'cabinet', name: '双门衣柜', category: 'storage', w: 1.85, d: .72 },
  { kind: 'nightstand', name: '床头柜', category: 'storage', w: .72, d: .72 },
  { kind: 'console', name: '电视矮柜', category: 'storage', w: 2.6, d: .55 },
  { kind: 'rug', name: '编织地毯', category: 'decor', w: 3.8, d: 2.8, floor: true, tintable: true },
  { kind: 'lamp', name: '纸艺落地灯', category: 'decor', w: .67, d: .67 },
  { kind: 'plant', name: '落地绿植', category: 'decor', w: .95, d: .95 },
  { kind: 'small-plant', name: '小型盆栽', category: 'decor', w: .62, d: .62 },
  { kind: 'rack', name: '木质衣帽架', category: 'decor', w: .7, d: .7 },
];
export const BY_KIND = Object.fromEntries(CATALOG.map(item => [item.kind, item]));
export const TINTS = { default: null, linen: '#e9ddc7', clay: '#b57250', sage: '#95a48b', blue: '#71889d' };
export const DEFAULT_LAYOUT = [
  ['sofa', -3.35, -.05], ['desk', -.65, -2.80], ['chair', -.8, -1.15],
  ['bed', 2.85, 1.15], ['shelf', -4.43, -3.05], ['plant', 2.08, -2.85],
  ['small-plant', -3.17, -2.9], ['coffee', -2.25, 1.8], ['rug', -2.6, 1.8],
  ['lamp', -4.72, 1.7], ['side', -3.95, 1.48], ['nightstand', 4.77, -.64],
].map(([kind, x, z], index) => ({ id: `starter-${index}`, kind, x, z, rotation: 0, tint: 'default' }));
