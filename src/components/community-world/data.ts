import { decodeFurniture } from './roomLayout';
export type FurnitureKind = 'plant' | 'sofa' | 'shelf' | 'lamp' | 'rug' | 'art' | 'loveseat' | 'armchair' | 'chair' | 'stool' | 'desk' | 'coffee' | 'side' | 'dining' | 'bed' | 'single-bed' | 'cabinet' | 'nightstand' | 'console' | 'small-plant' | 'rack';
export type Furniture = { id: string; kind: FurnitureKind; x: number; z: number; rotation: number; tint?: string };
export type Room = { id: string; x: number; z: number; name: string; owner: string; tags: string[]; bio: string; color: string; floor: string; furniture: Furniture[]; occupied: boolean; mine?: boolean; district?: string; style?: string; designVersion?: number };
export const COLORS = ['#7e9d83', '#75a9cc', '#b39ad0', '#dba29f', '#d0b368', '#78b8ae'];
export const FLOORS = ['#f1eee5', '#e3e8dc', '#e9e0d9', '#d2ac7d', '#987555', '#dfcdb0', '#bbad8d'];
export const WORLD = { columns: 5, rows: 5, stepX: 7.5, stepZ: 7.5, roomWidth: 6.8, roomDepth: 6.2, blockSize: 40, islandHalf: 80 };
export const DISTRICTS = [
  { id: 'A', name: '向阳里', x: -46, z: -46 }, { id: 'B', name: '海风里', x: 46, z: -46 },
  { id: 'C', name: '青禾里', x: -46, z: 46 }, { id: 'D', name: '星光里', x: 46, z: 46 },
];
export const LANDMARKS = [
  { id: 'plaza', name: '同路人广场', x: 0, z: 0, description: '世界公告栏 · Offer / 面经 / 求助' },
  { id: 'football', name: '足球场', x: 0, z: -46, description: '一座完整足球场' },
  { id: 'park', name: '海风公园', x: -46, z: 0, description: '湖畔散步 · 林荫长椅' },
  { id: 'basketball', name: '篮球场', x: 46, z: -10, description: '运动街区 · 篮球' },
  { id: 'badminton', name: '羽毛球场', x: 46, z: 11, description: '运动街区 · 羽毛球' },
  { id: 'playground', name: '微光游乐场', x: 0, z: 46, description: '摩天轮 · 秋千 · 滑梯' },
] as const;
export const MAX_FURNITURE = 40;
export const ROOM_STYLES = [
  { id: 'oak', label: '暖橡木', floor: '#d2ac7d', wall: '#ece3cf' },
  { id: 'walnut', label: '胡桃木', floor: '#987555', wall: '#e1d7c4' },
  { id: 'cream', label: '奶油白', floor: '#dfcdb0', wall: '#f4eee0' },
  { id: 'sage', label: '鼠尾草', floor: '#bbad8d', wall: '#bdc5b3' },
];
export const FURNITURE_TINTS = [
  { id: 'default', label: '原色', color: '#e9ddc7' }, { id: 'linen', label: '亚麻', color: '#e9ddc7' },
  { id: 'clay', label: '陶土', color: '#b57250' }, { id: 'sage', label: '苔绿', color: '#95a48b' }, { id: 'blue', label: '雾蓝', color: '#71889d' },
];
export const FURNITURE: { kind: FurnitureKind; label: string; size: [number, number]; category: string; tintable?: boolean }[] = [
  { kind: 'sofa', label: '三人沙发', size: [2.24,.84], category: '座椅', tintable: true },
  { kind: 'loveseat', label: '双人沙发', size: [1.54,.84], category: '座椅', tintable: true },
  { kind: 'armchair', label: '休闲单椅', size: [.67,.67], category: '座椅', tintable: true },
  { kind: 'chair', label: '办公椅', size: [.67,.67], category: '座椅', tintable: true },
  { kind: 'stool', label: '圆形坐凳', size: [.46,.46], category: '座椅', tintable: true },
  { kind: 'desk', label: '窗边书桌', size: [2.98,.83], category: '桌台' },
  { kind: 'coffee', label: '圆形茶几', size: [1.08,1.08], category: '桌台' },
  { kind: 'side', label: '木质边几', size: [.47,.47], category: '桌台' },
  { kind: 'dining', label: '方形餐桌', size: [1.19,.88], category: '桌台' },
  { kind: 'bed', label: '舒适双人床', size: [2.08,2.75], category: '床' , tintable: true },
  { kind: 'single-bed', label: '轻巧单人床', size: [1.16,2.66], category: '床', tintable: true },
  { kind: 'shelf', label: '开放书架', size: [.91,.48], category: '收纳' },
  { kind: 'cabinet', label: '双门衣柜', size: [1.30,.51], category: '收纳' },
  { kind: 'nightstand', label: '床头柜', size: [.51,.51], category: '收纳' },
  { kind: 'console', label: '电视矮柜', size: [1.82,.39], category: '收纳' },
  { kind: 'rug', label: '编织地毯', size: [2.66,1.96], category: '装饰', tintable: true },
  { kind: 'lamp', label: '纸艺落地灯', size: [.47,.47], category: '装饰' },
  { kind: 'plant', label: '落地绿植', size: [.67,.67], category: '装饰' },
  { kind: 'small-plant', label: '小型盆栽', size: [.44,.44], category: '装饰' },
  { kind: 'rack', label: '木质衣帽架', size: [.49,.49], category: '装饰' },
  { kind: 'art', label: '灵感画架', size: [.9,.5], category: '装饰' },
];
const names = ['林间工作室', '慢慢来，也很快', '代码与咖啡', '向阳生长', '设计不设限', '制造一点可能', '下一站，杭州', '今天也在进步', '产品观察室', '数据有答案', '理想生活家', '面试补给站', '一颗螺丝钉', '周末实验室', '向海出发', '建筑小角落', '认真摸鱼', '小小研究所', '我的第一份 Offer', '一起向前'];
const owners = ['小林', '阿悦', '陈同学', '小禾', '南风', '周周', '木木', '安然', '小许', '可可', '一一', '小鹿', '阿程', '小北', '海盐', '知夏', '小鱼', '阿泽', '橙子', '小满'];
const professions = ['机械工程', '产品设计', '前端开发', '新能源', '视觉设计', '智能制造', '工业工程', '供应链', '产品经理', '数据分析'];
export function createRooms(): Room[] {
  let person = 0;
  return DISTRICTS.flatMap(district => Array.from({ length: WORLD.rows * WORLD.columns }, (_, i) => {
    const row = Math.floor(i / WORLD.columns), col = i % WORLD.columns;
    const occupied = i % 4 === 1 || i % 4 === 2;
    const n = person;
    if (occupied) person++;
    return { id: `${district.id}-${row + 1}${col + 1}`, district: district.name, x: district.x + (col - 2) * WORLD.stepX, z: district.z + (row - 2) * WORLD.stepZ,
      name: occupied ? names[n % names.length] : '留一间给未来的你', owner: occupied ? owners[n % owners.length] : '',
      tags: occupied ? [professions[n % professions.length], ['杭州', '上海', '深圳', '苏州'][n % 4], n % 3 ? '寻找搭子' : '准备面试'] : [],
      bio: occupied ? '把努力放进日常，也给灵感留一点空间。欢迎来坐坐，一起聊聊求职和生活。' : '',
      style: ROOM_STYLES[n % ROOM_STYLES.length].id, designVersion: 2, color: COLORS[n % COLORS.length], floor: FLOORS[n % FLOORS.length], occupied,
      furniture: occupied ? [ { id: `desk-${i}`, kind: 'desk', x: .1, z: -1.95, rotation: 0 }, { id: `chair-${i}`, kind: 'chair', x: .1, z: -.85, rotation: 0 }, { id: `p-${i}`, kind: 'plant', x: 2.55, z: -1.6, rotation: 0 }, { id: `r-${i}`, kind: 'rug', x: 0, z: .65, rotation: 0 }, { id: `s-${i}`, kind: n % 2 ? 'shelf' : 'sofa', x: -2, z: n % 2 ? -1.7 : 1.6, rotation: n % 2 ? 0 : Math.PI / 2 }, { id: `a-${i}`, kind: n % 3 ? 'art' : 'lamp', x: 2.3, z: 1.65, rotation: 0 } ] : [] };
  }));
}
const STORAGE_KEY = 'sugar-community-world:v2';
type SavedWorld = { version: 1; room: Room | null; likes: string[] };
export function loadWorld(): { room: Room | null; likes: string[]; warning?: string } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('sugar-community-world:v1');
    if (!raw) return { room: null, likes: [] };
    const parsed = JSON.parse(raw) as SavedWorld;
    if (parsed.version !== 1) throw new Error('version');
    const seed = createRooms();
    const r = parsed.room;
    if (r) {
      const target = seed.find(s => s.id === r.id && !s.occupied) || (/^[A-F]0[1-6]$/.test(r.id) ? seed.find(s => !s.occupied) : undefined);
      if (!target || typeof r.name !== 'string' || typeof r.bio !== 'string' || !Array.isArray(r.tags) || !Array.isArray(r.furniture)) throw new Error('invalid');
      return { room: { ...target, name: r.name.slice(0, 18), bio: r.bio.slice(0, 180), owner: '你', occupied: true, mine: true,
        tags: r.tags.filter(t => typeof t === 'string').slice(0, 4).map(t => t.slice(0, 12)), color: COLORS.includes(r.color) ? r.color : COLORS[0], floor: FLOORS.includes(r.floor) ? r.floor : FLOORS[0],
        style: ROOM_STYLES.some(s => s.id === r.style) ? r.style : 'oak', designVersion: 2, furniture: decodeFurniture(r.furniture, r.designVersion) }, likes: Array.isArray(parsed.likes) ? parsed.likes.filter(id => seed.some(s => s.id === id)) : [] };
    }
    return { room: null, likes: Array.isArray(parsed.likes) ? parsed.likes.filter(id => seed.some(s => s.id === id)) : [] };
  } catch { return { room: null, likes: [], warning: '本地存档无法读取，已载入初始街区。' }; }
}
export function saveWorld(room: Room | null, likes: string[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, room, likes } satisfies SavedWorld)); return true; }
  catch { return false; }
}
