import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { IconClose } from './icons';

// ============================================================
// 通用模态框 —— 用于新增 / 编辑各类记录
// 磨砂玻璃 + 大圆角。
//
// 关键：采用“遮罩层自身滚动 + min-height 居中包裹层”的健壮写法。
// 这样弹窗内容较短时垂直居中；内容超过屏幕高度时遮罩层滚动，
// 顶部（标题/必填项）永远不会被裁掉、始终可滚到。
// ============================================================
interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  /** 需要更宽布局的业务弹窗可覆盖默认 520px。 */
  maxWidth?: number | string;
  /** 弹窗始终限制在视口内，正文独立滚动，标题和底栏保持可见。 */
  maxHeight?: number | string;
  bodyClassName?: string;
  bodyStyle?: React.CSSProperties;
  panelClassName?: string;
  /** 该值变化时把弹窗滚回顶部（校验失败时让用户看到顶部必填项） */
  scrollTopSignal?: number;
}

export default function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  maxWidth = 520,
  maxHeight = '86vh',
  bodyClassName,
  bodyStyle,
  panelClassName,
  scrollTopSignal,
}: ModalProps) {
  const bodyRef = useRef<HTMLDivElement>(null);

  // 打开时禁止背景滚动 + 支持 ESC 关闭
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  // 打开时、或收到滚动信号时，把正文滚回顶部（确保标题/首个必填项可见）
  useEffect(() => {
    if (open && bodyRef.current) bodyRef.current.scrollTo({ top: 0, behavior: 'smooth' });
  }, [open, scrollTopSignal]);

  if (!open) return null;

  // 用 Portal 渲染到 <body>，脱离带 backdrop-filter/overflow:hidden 的应用外壳，
  // 否则 fixed 定位会以外壳卡片为基准并被其裁切（弹窗被困在白框内）。
  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(27,26,23,0.32)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'grid',
        placeItems: 'center',
        padding: '24px 16px',
        animation: 'fadeIn .2s ease',
      }}
    >
      <div
        className={panelClassName}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth,
          maxHeight,
          background: 'rgba(255,253,250,0.98)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.6)',
          borderRadius: 24,
          boxShadow: '0 30px 80px rgba(120,40,70,.24)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxSizing: 'border-box',
          animation: 'popIn .26s ease both',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 24px 12px',
            flex: 'none',
          }}
        >
          <h2 style={{ fontFamily: 'Poppins, sans-serif', fontSize: 20, fontWeight: 600, margin: 0 }}>{title}</h2>
          <button
            onClick={onClose}
            aria-label="关闭"
            className="btn-press"
            style={{
              width: 36,
              height: 36,
              borderRadius: 11,
              border: '1px solid #e4ddcf',
              background: '#faf7f0',
              color: '#8a8478',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 'none',
            }}
          >
            <IconClose />
          </button>
        </div>
        <div
          ref={bodyRef}
          className={`scrolly ${bodyClassName ?? ''}`.trim()}
          style={{ padding: '8px 24px 20px', overflowY: 'auto', flex: 1, minHeight: 0, ...bodyStyle }}
        >
          {children}
        </div>
        {footer && (
          <div
            style={{
              padding: '14px 24px 20px',
              borderTop: '1px solid #f0ebe0',
              background: 'rgba(255,253,250,0.98)',
              display: 'flex',
              gap: 10,
              justifyContent: 'flex-end',
              flexWrap: 'wrap',
              flex: 'none',
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
