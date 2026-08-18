import type { ReactNode } from 'react';
import { useAppShell } from '../contexts/AppShellContext';

// ============================================================
// 页面切换动效包裹层
//
// 全站在单页 screen 状态内换模块。这里只做一件事：给页面级内容
// 容器一次 opacity + translateY(6px) 的进入动效（约 180ms）。
//
// 用 key={screen} 让容器在换模块时重建，动效自然重播；点击当前
// 已激活的导航项时 screen 不变，key 不变，因此不会重播。
//
// 侧边栏、顶栏、搜索框、主题切换、背景都在这一层之外，不受影响；
// 列表卡片也不做逐个瀑布式入场。内容不做任何延迟挂载，业务状态
// 与数据加载时机保持原样。
// ============================================================
export default function PageTransition({ children }: { children: ReactNode }) {
  const { screen } = useAppShell();
  return (
    <div key={screen} className="page-transition">
      {children}
    </div>
  );
}
