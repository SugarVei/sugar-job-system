import { forwardRef, type ReactNode } from 'react';

// ============================================================
// 表单字段基础组件（输入框 / 下拉 / 多行）
// 统一圆角、focus 高亮，复用于所有新增/编辑弹窗
// ============================================================

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 600,
  color: '#4a463e',
  marginBottom: 6,
};

const controlStyle: React.CSSProperties = {
  width: '100%',
  minHeight: 44,
  border: '1px solid #ece4d6',
  background: '#faf7f0',
  borderRadius: 12,
  padding: '0 14px',
  fontSize: 14,
  color: '#1b1a17',
  outline: 'none',
};

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

export const TextInput = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function TextInput(props, ref) {
    return <input ref={ref} {...props} className="field-input" style={{ ...controlStyle, ...props.style }} />;
  },
);

export function TextArea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement>,
) {
  return (
    <textarea
      {...props}
      className="field-input"
      style={{ ...controlStyle, padding: '12px 14px', minHeight: 88, resize: 'vertical', ...props.style }}
    />
  );
}

export function Select(
  props: React.SelectHTMLAttributes<HTMLSelectElement>,
) {
  return (
    <select
      {...props}
      className="field-input"
      style={{ ...controlStyle, cursor: 'pointer', appearance: 'none', ...props.style }}
    />
  );
}

/** 弹窗底部主/次按钮 */
export function PrimaryButton({
  children,
  accent,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { accent?: string }) {
  return (
    <button
      {...props}
      className="btn-press"
      style={{
        height: 44,
        padding: '0 22px',
        border: 'none',
        borderRadius: 12,
        background: accent ?? '#1b1a17',
        color: '#f4f1ea',
        fontSize: 14.5,
        fontWeight: 600,
        cursor: 'pointer',
        ...props.style,
      }}
    >
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="btn-press"
      style={{
        height: 44,
        padding: '0 18px',
        border: '1px solid #e4ddcf',
        background: '#faf7f0',
        borderRadius: 12,
        fontSize: 14,
        fontWeight: 600,
        color: '#4a463e',
        cursor: 'pointer',
        ...props.style,
      }}
    >
      {children}
    </button>
  );
}
