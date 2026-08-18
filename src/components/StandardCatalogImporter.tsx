import { useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import Modal from './Modal';
import { IconFile, IconTrash } from './icons';
import { useAuth } from '../contexts/AuthContext';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { STANDARD_CATALOG_MAX_FILE_BYTES, type CatalogDiffRow, type CatalogDiffSummary } from '../lib/standardCompanyImport';

type PreviewResponse = {
  summary: CatalogDiffSummary & { sheets?: string[] };
  added: CatalogDiffRow[];
  updated: CatalogDiffRow[];
  skipped: CatalogDiffRow[];
  error?: string;
};

type ApplyResponse = {
  ok?: boolean;
  summary?: CatalogDiffSummary;
  written?: number;
  error?: string;
};

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('无法读取文件。'));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}

async function importHeaders() {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  if (isSupabaseConfigured) {
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) headers.set('Authorization', `Bearer ${data.session.access_token}`);
  }
  return headers;
}

export default function StandardCatalogImporter({
  updatedAt,
  catalogError,
  onApplied,
}: {
  updatedAt?: string | null;
  catalogError?: string | null;
  onApplied: () => Promise<void> | void;
}) {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<PreviewResponse | null>(null);

  const chooseFile = (next: File | null) => {
    setError('');
    setPreview(null);
    if (!next) {
      setFile(null);
      return;
    }
    if (!/\.xlsx$/i.test(next.name)) {
      setError('请上传飞书导出的 .xlsx 文件。');
      return;
    }
    if (next.size > STANDARD_CATALOG_MAX_FILE_BYTES) {
      setError('Excel 不能超过 2MB。');
      return;
    }
    setFile(next);
  };

  const onInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    chooseFile(event.target.files?.[0] ?? null);
    event.target.value = '';
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    chooseFile(event.dataTransfer.files?.[0] ?? null);
  };

  const previewImport = async () => {
    if (!file || loading) return;
    if (!user || !isSupabaseConfigured) {
      setError('需要登录并配置数据库后才能更新标准公司库。');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/standard-companies-import', {
        method: 'POST',
        headers: await importHeaders(),
        body: JSON.stringify({
          action: 'preview',
          file_name: file.name,
          file_data: await fileToDataUrl(file),
        }),
      });
      const data = await response.json() as PreviewResponse;
      if (!response.ok || data.error) throw new Error(data.error || '预览失败');
      setPreview(data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '预览失败');
    } finally {
      setLoading(false);
    }
  };

  const applyImport = async () => {
    if (!file || loading) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/standard-companies-import', {
        method: 'POST',
        headers: await importHeaders(),
        body: JSON.stringify({
          action: 'apply',
          file_name: file.name,
          file_data: await fileToDataUrl(file),
        }),
      });
      const data = await response.json() as ApplyResponse;
      if (!response.ok || data.error) throw new Error(data.error || '写入失败');
      setPreview(null);
      setFile(null);
      await onApplied();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '写入失败');
    } finally {
      setLoading(false);
    }
  };

  const latestLabel = updatedAt
    ? `上次导入 ${new Date(updatedAt).toLocaleString('zh-CN')}`
    : '还没有导入过飞书表';

  return (
    <section style={{ background: '#fffdf8', border: '1px solid #e0d8c9', borderRadius: 22, padding: 18 }}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 750, color: '#1b1a17' }}>用 Excel 更新标准公司库</h2>
          <p style={{ margin: '5px 0 0', fontSize: 12.5, color: '#8a8478', lineHeight: 1.55 }}>
            从飞书导出 xlsx，上传后先预览新增和更新，确认后再写入。只同步公司名、行业、城市、官网和分组，不会覆盖未出现在表里的公司。
          </p>
        </div>
        <span style={{ fontSize: 12, color: '#9a9488' }}>{latestLabel}</span>
      </div>

      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') inputRef.current?.click(); }}
        onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        style={{
          marginTop: 15,
          border: `1.5px dashed ${dragging ? '#9b633d' : '#d8cbb8'}`,
          background: dragging ? '#fff6eb' : '#faf7f0',
          borderRadius: 16,
          padding: '20px 16px',
          textAlign: 'center',
          cursor: 'pointer',
        }}
        aria-label="点击或拖拽上传 Excel"
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={onInputChange}
          style={{ display: 'none' }}
        />
        {file ? (
          <div className="flex items-center justify-center gap-2" style={{ color: '#4f7a56' }}>
            <IconFile size={20} />
            <span style={{ fontSize: 13.5, fontWeight: 700 }}>{file.name}</span>
            <span style={{ fontSize: 12, fontWeight: 500 }}>（{(file.size / 1024).toFixed(0)} KB）</span>
            <button
              type="button"
              onClick={(event) => { event.stopPropagation(); chooseFile(null); }}
              aria-label="移除文件"
              style={{ border: 0, background: 'transparent', color: '#8a8478', cursor: 'pointer', display: 'inline-flex' }}
            >
              <IconTrash size={15} />
            </button>
          </div>
        ) : (
          <>
            <div style={{ color: '#9b633d', display: 'flex', justifyContent: 'center' }}><IconFile size={24} /></div>
            <div style={{ marginTop: 7, fontSize: 13.5, fontWeight: 700, color: '#4a463e' }}>点击上传，或把飞书导出的 Excel 拖到这里</div>
            <div style={{ marginTop: 4, fontSize: 12, color: '#9a9488' }}>仅支持 .xlsx，最大 2MB；表头需包含公司名</div>
          </>
        )}
      </div>

      {(error || catalogError) && (
        <div style={{ marginTop: 12, color: '#a23d24', fontSize: 12.5, lineHeight: 1.55 }}>
          {error || catalogError}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 flex-wrap" style={{ marginTop: 15 }}>
        <span style={{ fontSize: 11.5, color: '#9a9488' }}>默认只新增缺失公司，并补全/更新已有公司的官网和分组。</span>
        <button
          type="button"
          onClick={() => void previewImport()}
          disabled={!file || loading}
          className="btn-press"
          style={{
            border: 0,
            borderRadius: 12,
            height: 40,
            padding: '0 18px',
            background: !file || loading ? '#d8d0c2' : '#1b1a17',
            color: '#fffdf8',
            cursor: !file || loading ? 'not-allowed' : 'pointer',
            fontSize: 13,
            fontWeight: 750,
          }}
        >
          {loading ? '正在解析…' : '预览变更'}
        </button>
      </div>

      <Modal
        open={Boolean(preview)}
        title="确认写入标准公司库"
        onClose={() => { if (!loading) setPreview(null); }}
        maxWidth={720}
        footer={(
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setPreview(null)}
              disabled={loading}
              className="btn-press"
              style={{ height: 38, padding: '0 14px', borderRadius: 12, border: '1px solid #e0d8c9', background: '#fffdf8', color: '#6b665c', fontWeight: 700 }}
            >
              取消
            </button>
            <button
              type="button"
              onClick={() => void applyImport()}
              disabled={loading || ((preview?.summary.added ?? 0) + (preview?.summary.updated ?? 0) === 0)}
              className="btn-press"
              style={{
                height: 38,
                padding: '0 16px',
                borderRadius: 12,
                border: 0,
                background: loading ? '#d8d0c2' : '#1b1a17',
                color: '#fffdf8',
                fontWeight: 750,
              }}
            >
              {loading ? '正在写入…' : '确认写入'}
            </button>
          </div>
        )}
      >
        {preview && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <SummaryChip label="新增" value={preview.summary.added} color="#2f7040" background="#e6f3e7" />
              <SummaryChip label="更新" value={preview.summary.updated} color="#41658f" background="#eaf1fa" />
              <SummaryChip label="不变" value={preview.summary.unchanged} color="#6f6961" background="#f1efeb" />
              <SummaryChip label="跳过" value={preview.summary.skipped} color="#8b4d58" background="#f7e9ec" />
            </div>
            <DiffList title="将新增" rows={preview.added} empty="没有新公司" />
            <DiffList title="将更新" rows={preview.updated} empty="没有字段变化" showBefore />
            <DiffList title="将跳过" rows={preview.skipped} empty="没有跳过的行" showReason />
          </div>
        )}
      </Modal>
    </section>
  );
}

function SummaryChip({ label, value, color, background }: { label: string; value: number; color: string; background: string }) {
  return (
    <div style={{ borderRadius: 14, padding: '10px 12px', background, color }}>
      <div style={{ fontFamily: 'Poppins', fontSize: 20, fontWeight: 750, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11.5, fontWeight: 700, marginTop: 6 }}>{label}</div>
    </div>
  );
}

function DiffList({
  title,
  rows,
  empty,
  showBefore,
  showReason,
}: {
  title: string;
  rows: CatalogDiffRow[];
  empty: string;
  showBefore?: boolean;
  showReason?: boolean;
}) {
  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 750, color: '#1b1a17' }}>{title} {rows.length} 家</div>
      {rows.length === 0 ? (
        <div style={{ marginTop: 6, fontSize: 12.5, color: '#8a8478' }}>{empty}</div>
      ) : (
        <ul style={{ margin: '8px 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rows.map((row, index) => {
            const company = row.next || row.incoming;
            return (
              <li key={`${row.kind}-${company.name}-${index}`} style={{ border: '1px solid #ebe3d7', borderRadius: 12, padding: '10px 12px' }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: '#4a463e' }}>{company.name}</div>
                <div style={{ marginTop: 3, fontSize: 12, color: '#8a8478' }}>
                  {[company.industry, company.city, company.group].filter(Boolean).join(' · ')}
                </div>
                {company.url && <div style={{ marginTop: 3, fontSize: 12, color: '#6b665c', wordBreak: 'break-all' }}>{company.url}</div>}
                {showBefore && row.current && (
                  <div style={{ marginTop: 4, fontSize: 11.5, color: '#9a9488' }}>
                    原：{[row.current.industry, row.current.city, row.current.url].filter(Boolean).join(' · ')}
                  </div>
                )}
                {showReason && row.reason && <div style={{ marginTop: 4, fontSize: 11.5, color: '#8b4d58' }}>{row.reason}</div>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
