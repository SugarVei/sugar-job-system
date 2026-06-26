import { useEffect, useRef, type ReactNode } from 'react';
import { IconClose } from './icons';

// ============================================================
// 通用模态框 —— 用于新增 / 编辑各类记录
// 磨砂玻璃 + 大圆角，移动端自适应铺满
// ============================================================
interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  /** 该值变化时把弹窗内容滚回顶部（用于校验失败时让用户看到顶部必填项） */
  scrollTopSignal?: number;
}

export default function Modal({ open, title, onClose, children, footer, scrollTopSignal }: ModalProps) {
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

  // 打开时、或收到滚动信号时，把弹窗滚回顶部
  useEffect(() => {
    if (open && bodyRef.current) bodyRef.current.scrollTo({ top: 0, behavior: 'smooth' });
  }, [open, scrollTopSignal]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(40,30,25,0.34)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        animation: 'fadeIn .2s ease',
      }}
    >
      <div
        ref={bodyRef}
        onClick={(e) => e.stopPropagation()}
        className="scrolly"
        style={{
          width: '100%',
          maxWidth: 520,
          maxHeight: '90vh',
          overflowY: 'auto',
          background: 'rgba(255,253,250,0.96)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.6)',
          borderRadius: 26,
          boxShadow: '0 30px 80px rgba(120,40,70,.24)',
          animation: 'popIn .26s ease both',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '22px 24px 6px',
          }}
        >
          <h2
            style={{
              fontFamily: 'Poppins, sans-serif',
              fontSize: 20,
              fontWeight: 600,
              margin: 0,
            }}
          >
            {title}
          </h2>
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
            }}
          >
            <IconClose />
          </button>
        </div>
        <div style={{ padding: '14px 24px 22px' }}>{children}</div>
        {footer && (
          <div
            style={{
              padding: '14px 24px 22px',
              borderTop: '1px solid #f0ebe0',
              display: 'flex',
              gap: 10,
              justifyContent: 'flex-end',
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
