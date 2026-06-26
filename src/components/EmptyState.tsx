import { useTheme } from '../contexts/ThemeContext';

// ============================================================
// 空状态 / 加载占位
// ============================================================
export default function EmptyState({
  text,
  actionLabel,
  onAction,
}: {
  text: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const { theme } = useTheme();
  return (
    <div
      style={{
        background: '#fffdf8',
        borderRadius: 22,
        boxShadow: '0 6px 18px rgba(60,50,35,.05)',
        padding: '48px 24px',
        textAlign: 'center',
        color: '#8a8478',
        fontSize: 14.5,
      }}
    >
      <div style={{ fontSize: 38, marginBottom: 10 }}>🍬</div>
      <div>{text}</div>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="btn-press"
          style={{
            marginTop: 16,
            height: 42,
            padding: '0 22px',
            border: 'none',
            borderRadius: 12,
            background: theme.accent,
            color: '#fff',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
