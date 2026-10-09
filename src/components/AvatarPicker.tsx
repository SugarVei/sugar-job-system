import { useEffect, useRef, useState, type ChangeEvent, type CSSProperties } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { IconClose } from './icons';
import './AvatarPicker.css';

const candidates = Array.from({ length: 35 }, (_, index) =>
  `/avatars/candidates/avatar-${String(index + 1).padStart(2, '0')}.png`,
);

export const OPEN_AVATAR_PICKER_EVENT = 'sugar:open-avatar-picker';

type AvatarPickerProps = {
  open: boolean;
  onClose: () => void;
  onSave: (avatar: string) => Promise<void>;
};

export default function AvatarPicker({ open, onClose, onSave }: AvatarPickerProps) {
  const { theme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const onCloseRef = useRef(onClose);
  const [selectedAvatar, setSelectedAvatar] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    setSelectedAvatar('');
    setError('');
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  if (!open) return null;

  const themeVariables = {
    '--avatar-accent': theme.accent,
    '--avatar-accent-soft': theme.accentSoft,
    '--avatar-theme-dot': theme.dot,
    '--avatar-theme-vig': theme.vig,
  } as CSSProperties;

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('请选择图片文件。');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError('图片不能超过 8 MB，请选择较小的图片。');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setSelectedAvatar(reader.result);
        setError('');
      }
    };
    reader.onerror = () => setError('图片读取失败，请重试。');
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!selectedAvatar || saving) return;
    setSaving(true);
    setError('');
    try {
      await onSave(selectedAvatar);
      onClose();
    } catch {
      setError('头像保存失败，请稍后重试。');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="avatar-picker-backdrop"
      style={themeVariables}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
    >
      <section
        className="avatar-picker"
        role="dialog"
        aria-modal="true"
        aria-labelledby="avatar-picker-title"
      >
        <header className="avatar-picker__header">
          <div>
            <h2 id="avatar-picker-title">更换头像</h2>
            <p>选择一张喜欢的图片作为个人头像</p>
          </div>
          <button
            type="button"
            className="avatar-picker__close"
            onClick={onClose}
            aria-label="关闭头像选择窗口"
            disabled={saving}
          >
            <IconClose size={19} />
          </button>
        </header>

        <div className="avatar-picker__content">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="avatar-picker__file-input"
            tabIndex={-1}
          />
          <button
            type="button"
            className={`avatar-picker__upload${selectedAvatar.startsWith('data:image/') ? ' is-selected' : ''}`}
            onClick={() => fileInputRef.current?.click()}
          >
            {selectedAvatar.startsWith('data:image/') ? (
              <img className="avatar-picker__upload-preview" src={selectedAvatar} alt="待使用的上传头像预览" />
            ) : (
              <span className="avatar-picker__upload-icon" aria-hidden="true">↑</span>
            )}
            <span className="avatar-picker__upload-copy">
              <strong>{selectedAvatar.startsWith('data:image/') ? '已选择图片，点击重新选择' : '上传自己的图片'}</strong>
              <small>支持 JPG、PNG，建议正方形图片</small>
            </span>
          </button>

          <div className="avatar-picker__section-heading">
            <h3>选择一个可爱头像</h3>
            <span>共 35 款</span>
          </div>
          <div className="avatar-picker__grid" role="radiogroup" aria-label="预设头像">
            {candidates.map((candidate, index) => (
              <button
                key={candidate}
                type="button"
                role="radio"
                aria-checked={selectedAvatar === candidate}
                aria-label={`预设头像 ${index + 1}`}
                className={`avatar-picker__candidate${selectedAvatar === candidate ? ' is-selected' : ''}`}
                onClick={() => {
                  setSelectedAvatar(candidate);
                  setError('');
                }}
              >
                <img src={candidate} alt="" loading="lazy" />
                {selectedAvatar === candidate && <span className="avatar-picker__check" aria-hidden="true">✓</span>}
              </button>
            ))}
          </div>
          {error && <p className="avatar-picker__error" role="alert">{error}</p>}
        </div>

        <footer className="avatar-picker__footer">
          <button type="button" className="avatar-picker__cancel" onClick={onClose} disabled={saving}>
            取消
          </button>
          <button
            type="button"
            className="avatar-picker__confirm"
            onClick={handleSave}
            disabled={!selectedAvatar || saving}
          >
            {saving ? '保存中…' : '使用此头像'}
          </button>
        </footer>
      </section>
    </div>
  );
}
