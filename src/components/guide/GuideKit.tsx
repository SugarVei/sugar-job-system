import { useEffect, useRef, type ReactNode } from "react";
import { Puzzle, X } from "lucide-react";

// 插件教程页（智能信息录入、智能填表助手）共用的小组件。
// 样式在 src/pages/SmartInformationEntry.css，需放在 .smart-input-page 内使用。

export type BrowserKind = "Chrome" | "Edge";

export function Mark({ small = false }: { small?: boolean }) {
  return (
    <span className={`brand ${small ? "brand-small" : ""}`}>
      <img src="/sugar-logo-v2.png" alt="" />
      <span>Sugar</span>
    </span>
  );
}
export function ChromeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="#e9e3d7" />
      <path
        d="M12 2a10 10 0 0 1 8.7 5H11l-4 7-4.7-8A10 10 0 0 1 12 2Z"
        fill="#c35b4e"
      />
      <path d="M20.7 7a10 10 0 0 1-8.6 15l4.8-8.3L12 7Z" fill="#e2b847" />
      <path d="M12.1 22A10 10 0 0 1 2.3 6L7 14l5 8Z" fill="#72996b" />
      <circle cx="12" cy="12" r="4.3" fill="#fffdf8" />
      <circle cx="12" cy="12" r="3.2" fill="#7a9bbf" />
    </svg>
  );
}
export function BrowserSwitch({
  browser,
  setBrowser,
}: {
  browser: BrowserKind;
  setBrowser: (browser: BrowserKind) => void;
}) {
  return (
    <div className="browser-switch" aria-label="选择浏览器">
      {(["Chrome", "Edge"] as const).map((b) => (
        <button
          key={b}
          aria-label={b}
          aria-pressed={browser === b}
          className={browser === b ? "active" : ""}
          onClick={() => setBrowser(b)}
        >
          {b === "Chrome" ? (
            <ChromeIcon />
          ) : (
            <span className="edge-icon" aria-hidden="true">
              e
            </span>
          )}
          {b}
        </button>
      ))}
    </div>
  );
}
export function BrowserFrame({
  title,
  children,
  compact = false,
}: {
  title: string;
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={`browser-frame ${compact ? "compact" : ""}`}>
      <div className="browser-title">
        <div className="window-dots">
          <i />
          <i />
          <i />
        </div>
        <span>{title}</span>
        <Puzzle size={14} />
      </div>
      {children}
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.showModal();
    return () => previous?.focus?.();
  }, []);
  return (
    <dialog
      className={`modal ${wide ? "wide" : ""}`}
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <header>
        <h2>{title}</h2>
        <button className="icon-button" aria-label="关闭弹窗" onClick={onClose}>
          <X size={18} />
        </button>
      </header>
      {children}
    </dialog>
  );
}
export function ModuleTabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
  idPrefix,
}: {
  tabs: readonly T[];
  value: T;
  onChange: (tab: T) => void;
  label: string;
  idPrefix: string;
}) {
  return (
    <div
      className="module-tabs"
      role="tablist"
      aria-label={label}
      onKeyDown={(e) => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key))
          return;
        e.preventDefault();
        const focusedIndex = Array.from(e.currentTarget.children).findIndex(
          (child) => child.contains(e.target as Node),
        );
        const i = focusedIndex < 0 ? tabs.indexOf(value) : focusedIndex,
          next =
            e.key === "Home"
              ? 0
              : e.key === "End"
                ? tabs.length - 1
                : (i + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) %
                  tabs.length;
        onChange(tabs[next]);
        (e.currentTarget.children[next] as HTMLElement | undefined)?.focus();
      }}
    >
      {tabs.map((t, index) => (
        <button
          key={t}
          id={`${idPrefix}-${index}`}
          role="tab"
          tabIndex={value === t ? 0 : -1}
          aria-selected={value === t}
          aria-controls="module-content"
          className={value === t ? "active" : ""}
          onClick={() => onChange(t)}
        >
          {t}
        </button>
      ))}
    </div>
  );
}
