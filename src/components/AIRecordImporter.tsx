import { useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { useApiKeys } from '../contexts/ApiKeysContext';
import { useTheme } from '../contexts/ThemeContext';
import { PROVIDERS } from '../lib/providers';
import { FormError, PrimaryButton, TextArea } from './Field';

export interface ApplicationExtraction {
  company_name: string | null;
  position_name: string | null;
  city: string | null;
  channel: string | null;
  apply_date: string | null;
  status: string;
  salary_range: string | null;
  job_url: string | null;
  jd_text: string | null;
  jd_keywords: string[];
  next_action: string | null;
  next_action_at: string | null;
  deadline_at: string | null;
  priority: string;
  notes: string | null;
}

export interface OfferExtraction {
  company_name: string | null;
  position_name: string | null;
  city: string | null;
  department: string | null;
  manager_or_contact: string | null;
  workplace: string | null;
  work_schedule: string | null;
  join_date: string | null;
  reply_deadline: string | null;
  offer_status: string;
  base_salary: number | null;
  salary_months: number | null;
  bonus: number | null;
  subsidy: number | null;
  annual_package: number | null;
  social_security: string | null;
  housing_fund: string | null;
  stock_or_options: string | null;
  probation_months: number | null;
  probation_ratio: number | null;
  overtime_policy: string | null;
  hr_offer: string | null;
  negotiation_notes: string | null;
  next_action: string | null;
  next_action_at: string | null;
  is_big_week: boolean;
  is_overtime: boolean;
  is_remote: boolean;
  probation_cut: boolean;
  has_penalty: boolean;
  risk_notes: string | null;
  decision_notes: string | null;
  final_decision: string | null;
  notes: string | null;
}

interface Props<T> {
  kind: 'application' | 'offer';
  onApply: (data: T) => void;
}

interface Screenshot {
  id: string;
  name: string;
  dataUrl: string;
}

const MAX_SCREENSHOTS = 3;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

class LocalOcrError extends Error {
  readonly cause: unknown;

  constructor(cause: unknown) {
    super('本地截图读取失败，请检查网络后重试，或直接粘贴岗位文字。');
    this.cause = cause;
  }
}

function compressScreenshot(file: File): Promise<Screenshot> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) return reject(new Error('只能上传 PNG、JPG 或 WebP 图片。'));
    if (file.size > MAX_FILE_SIZE) return reject(new Error(`${file.name} 超过 10MB，请先压缩后再上传。`));
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`读取 ${file.name} 失败。`));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error(`${file.name} 不是可识别的图片。`));
      image.onload = () => {
        const maxSide = 2200;
        const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext('2d');
        if (!context) return reject(new Error('浏览器暂时无法处理这张图片。'));
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve({
          id: `${file.name}-${file.lastModified}-${crypto.randomUUID()}`,
          name: file.name,
          dataUrl: canvas.toDataURL('image/jpeg', 0.88),
        });
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export default function AIRecordImporter<T extends ApplicationExtraction | OfferExtraction>({ kind, onApply }: Props<T>) {
  const { requireActiveConfig, activeProvider } = useApiKeys();
  const { theme } = useTheme();
  const [sourceText, setSourceText] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isApplication = kind === 'application';

  const addScreenshots = async (files: File[]) => {
    setError('');
    setSuccess('');
    const remaining = MAX_SCREENSHOTS - screenshots.length;
    if (remaining <= 0) return setError(`最多上传 ${MAX_SCREENSHOTS} 张截图。`);
    try {
      const next = await Promise.all(files.slice(0, remaining).map(compressScreenshot));
      const totalPayload = [...screenshots, ...next].reduce((sum, item) => sum + item.dataUrl.length, 0);
      if (totalPayload > 4_000_000) throw new Error('截图总大小过大，请减少图片数量或先裁剪无关区域。');
      setScreenshots(current => [...current, ...next].slice(0, MAX_SCREENSHOTS));
      if (files.length > remaining) setError(`最多上传 ${MAX_SCREENSHOTS} 张截图，多余图片未添加。`);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : String(uploadError));
    }
  };

  const handleFiles = (event: ChangeEvent<HTMLInputElement>) => {
    void addScreenshots(Array.from(event.target.files ?? []));
    event.target.value = '';
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    void addScreenshots(Array.from(event.dataTransfer.files));
  };

  const recognize = async () => {
    const text = sourceText.trim();
    if ((!text && screenshots.length === 0) || loading) return;
    const config = requireActiveConfig(isApplication ? 'AI 智能识别岗位信息' : 'AI 智能识别 Offer');
    if (!config) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      let requestText = text;
      let requestImages = screenshots.map(item => item.dataUrl);
      if (requestImages.length > 0 && !PROVIDERS[config.provider].supportsVision) {
        setLoadingMessage('正在加载本地 OCR…');
        let ocrText = '';
        try {
          const { extractTextFromImages } = await import('../lib/localOcr');
          ocrText = await extractTextFromImages(requestImages, ({ imageIndex, imageCount, progress }) => {
            setLoadingMessage(`读取截图 ${imageIndex}/${imageCount} · ${Math.round(progress * 100)}%`);
          });
        } catch (ocrError) {
          console.error('[AIRecordImporter] local OCR failed:', ocrError);
          throw new LocalOcrError(ocrError);
        }
        if (!ocrText) throw new Error('没有从截图中读到清晰文字，请裁剪到岗位内容区域或改为粘贴文字。');
        requestText = [text, ocrText].filter(Boolean).join('\n\n');
        requestImages = [];
      }
      setLoadingMessage('AI 正在整理字段…');
      const response = await fetch('/api/record-extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind,
          sourceText: requestText,
          images: requestImages,
          provider: config.provider,
          apiKey: config.apiKey,
          model: config.model,
        }),
      });
      const result = await response.json() as { data?: T; error?: string };
      if (!response.ok || result.error || !result.data) throw new Error(result.error || 'AI 没有返回可用的识别结果。');
      onApply(result.data);
      setSuccess('识别完成，已自动回填表单。请核对后再保存。');
    } catch (recognitionError) {
      setError(recognitionError instanceof Error ? recognitionError.message : String(recognitionError));
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  return (
    <section className="ai-record-importer" style={{ borderColor: `${theme.accent}32`, background: theme.accentSoft }}>
      <div className="ai-record-importer__header">
        <div className="ai-record-importer__badge" style={{ background: theme.accent }}>AI</div>
        <div>
          <div className="ai-record-importer__title">{isApplication ? 'AI 智能识别岗位信息' : 'AI 智能识别 Offer'}</div>
          <div className="ai-record-importer__subtitle">
            使用当前的 {PROVIDERS[activeProvider].label} · {PROVIDERS[activeProvider].supportsVision
              ? '只回填表单，不会直接保存'
              : '截图会先在本机读取，不额外消耗 API 额度'}
          </div>
        </div>
      </div>
      <TextArea
        value={sourceText}
        onChange={event => setSourceText(event.target.value)}
        placeholder={isApplication
          ? '粘贴招聘网站中的岗位 JD、职位描述或 HR 沟通内容…'
          : '粘贴 Offer 邮件、录用通知、薪资说明或 HR 聊天内容…'}
        style={{ minHeight: 104, background: '#fffdf8', resize: 'vertical' }}
      />
      <div
        className={`ai-record-importer__dropzone${dragging ? ' is-dragging' : ''}`}
        style={{ borderColor: dragging ? theme.accent : `${theme.accent}55` }}
        onDragEnter={event => { event.preventDefault(); setDragging(true); }}
        onDragOver={event => event.preventDefault()}
        onDragLeave={event => { if (event.currentTarget === event.target) setDragging(false); }}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') fileInputRef.current?.click(); }}
      >
        <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" multiple hidden onChange={handleFiles} />
        <span className="ai-record-importer__upload-icon">▣</span>
        <span><strong>拖入岗位或 Offer 截图</strong><small>也可以点击选择图片，最多 {MAX_SCREENSHOTS} 张</small></span>
      </div>
      {screenshots.length > 0 && (
        <div className="ai-record-importer__previews">
          {screenshots.map(item => (
            <div key={item.id} className="ai-record-importer__preview">
              <img src={item.dataUrl} alt={item.name} />
              <span title={item.name}>{item.name}</span>
              <button
                type="button"
                aria-label={`删除 ${item.name}`}
                onClick={() => setScreenshots(current => current.filter(image => image.id !== item.id))}
              >×</button>
            </div>
          ))}
        </div>
      )}
      <div className="ai-record-importer__actions">
        <span>{PROVIDERS[activeProvider].supportsVision
          ? '支持“文字 + 截图”一起识别；保存前请核对关键金额和日期。'
          : '截图先做本地 OCR，再由当前 AI 填表；保存前请核对金额和日期。'}</span>
        <PrimaryButton
          type="button"
          accent={theme.accent}
          onClick={() => void recognize()}
          disabled={(!sourceText.trim() && screenshots.length === 0) || loading}
          style={{ minWidth: 168 }}
        >
          {loading ? (loadingMessage || '正在识别…') : '智能识别并填充'}
        </PrimaryButton>
      </div>
      {error && <FormError message={error} />}
      {success && <div className="ai-record-importer__success" role="status">{success}</div>}
    </section>
  );
}
