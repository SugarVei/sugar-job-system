import { useEffect, useMemo, useState } from 'react';
import type { Resume, NewRecord } from '../types';
import { useCollection } from '../hooks/useCollection';
import { useAppShell } from '../contexts/AppShellContext';
import { useTheme } from '../contexts/ThemeContext';
import Modal from '../components/Modal';
import { Field, TextInput, TextArea, PrimaryButton, GhostButton } from '../components/Field';
import { IconEdit, IconTrash, IconPlus, IconFile, IconExternalLink } from '../components/icons';
import { CARD } from '../lib/appHelpers';
import EmptyState from '../components/EmptyState';

const empty: NewRecord<Resume> = {
  resume_name: '',
  target_position: '',
  file_url: '',
  notes: '',
};

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
  } catch {
    return iso;
  }
}

export default function Resumes() {
  const { items, loading, create, update, remove } = useCollection<Resume>('resumes', {
    column: 'updated_at',
    ascending: false,
  });
  const { query, registerAdd } = useAppShell();
  const { theme } = useTheme();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Resume | null>(null);
  const [form, setForm] = useState<NewRecord<Resume>>(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    registerAdd(() => openCreate());
    return () => registerAdd(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registerAdd]);

  const openCreate = () => {
    setEditing(null);
    setForm(empty);
    setModalOpen(true);
  };
  const openEdit = (r: Resume) => {
    setEditing(r);
    setForm({
      resume_name: r.resume_name,
      target_position: r.target_position ?? '',
      file_url: r.file_url ?? '',
      notes: r.notes ?? '',
    });
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.resume_name) {
      alert('请填写简历名称');
      return;
    }
    setSaving(true);
    try {
      if (editing) await update(editing.id, form);
      else await create(form);
      setModalOpen(false);
    } catch (e) {
      alert('保存失败：' + (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const del = async (r: Resume) => {
    if (!confirm(`确定删除「${r.resume_name}」吗？`)) return;
    await remove(r.id);
  };

  const filtered = useMemo(
    () =>
      items.filter((r) => {
        if (!query) return true;
        const t = query.toLowerCase();
        return [r.resume_name, r.target_position, r.notes]
          .filter(Boolean)
          .some((v) => (v as string).toLowerCase().includes(t));
      }),
    [items, query],
  );

  return (
    <div className="animate-rise">
      <div className="flex justify-end mb-[18px]">
        <PrimaryButton accent={theme.accent} onClick={openCreate} style={{ height: 44 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <IconPlus size={16} /> 新增简历
          </span>
        </PrimaryButton>
      </div>

      {loading ? (
        <EmptyState text="加载中…" />
      ) : filtered.length === 0 ? (
        <EmptyState
          text={items.length === 0 ? '还没有简历版本，添加一份吧' : '没有符合条件的简历'}
          actionLabel={items.length === 0 ? '新增简历' : undefined}
          onAction={items.length === 0 ? openCreate : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-[18px]">
          {filtered.map((r) => (
            <div key={r.id} className="card-hover" style={{ ...CARD, padding: 24 }}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 style={{ fontFamily: 'Poppins', fontSize: 18, fontWeight: 600, margin: '0 0 10px' }}>
                    {r.resume_name}
                  </h3>
                  <div className="flex gap-2 flex-wrap">
                    {r.target_position && (
                      <span style={{ background: '#ece4d6', color: '#5d584d', fontSize: 12, fontWeight: 600, padding: '4px 11px', borderRadius: 999 }}>
                        {r.target_position}
                      </span>
                    )}
                    <span style={{ border: '1px solid #e0d8c9', color: '#8a8478', fontSize: 12, fontWeight: 600, padding: '4px 11px', borderRadius: 999 }}>
                      更新于 {fmtDate(r.updated_at)}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1 flex-none">
                  <button onClick={() => openEdit(r)} aria-label="编辑" className="btn-press" style={miniBtn}>
                    <IconEdit size={14} />
                  </button>
                  <button onClick={() => del(r)} aria-label="删除" className="btn-press" style={miniBtn}>
                    <IconTrash size={14} />
                  </button>
                </div>
              </div>

              {r.notes && (
                <p style={{ fontSize: 13, lineHeight: 1.6, color: '#8a8478', margin: '14px 0 16px' }}>{r.notes}</p>
              )}

              {/* 文件链接 / 上传扩展位 */}
              {r.file_url ? (
                <a
                  href={r.file_url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    border: '1px solid #f0ebe0',
                    borderRadius: 13,
                    padding: '11px 14px',
                    textDecoration: 'none',
                  }}
                >
                  <span className="flex items-center gap-[11px]" style={{ minWidth: 0 }}>
                    <span
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 10,
                        background: '#dcebd5',
                        color: '#2f5d36',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flex: 'none',
                      }}
                    >
                      <IconFile size={16} />
                    </span>
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: '#1b1a17', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      查看简历文件
                    </span>
                  </span>
                  <IconExternalLink size={14} />
                </a>
              ) : (
                <div
                  style={{
                    border: '1.5px dashed #d8cfbd',
                    background: '#faf7f0',
                    borderRadius: 14,
                    padding: 16,
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#4a463e' }}>暂未关联文件</div>
                  <div style={{ fontSize: 11.5, color: '#a39d90', marginTop: 4 }}>
                    可在编辑中填写文件链接（后续可扩展为直接上传）
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        title={editing ? '编辑简历' : '新增简历'}
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <GhostButton onClick={() => setModalOpen(false)}>取消</GhostButton>
            <PrimaryButton accent={theme.accent} onClick={save} disabled={saving}>
              {saving ? '保存中…' : '保存'}
            </PrimaryButton>
          </>
        }
      >
        <Field label="简历名称 *">
          <TextInput value={form.resume_name} onChange={(e) => setForm({ ...form, resume_name: e.target.value })} placeholder="如 产品-互联网版" />
        </Field>
        <Field label="适用岗位">
          <TextInput value={form.target_position ?? ''} onChange={(e) => setForm({ ...form, target_position: e.target.value })} placeholder="如 产品经理" />
        </Field>
        <Field label="文件链接（可选）">
          <TextInput value={form.file_url ?? ''} onChange={(e) => setForm({ ...form, file_url: e.target.value })} placeholder="云盘 / 在线简历链接 https://" />
        </Field>
        <Field label="备注">
          <TextArea value={form.notes ?? ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="这一版的侧重点、适用场景等" />
        </Field>
      </Modal>
    </div>
  );
}

const miniBtn: React.CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: 10,
  border: '1px solid #e4ddcf',
  background: '#faf7f0',
  color: '#8a8478',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
};
