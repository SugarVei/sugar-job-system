import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowDown,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Copy,
  Download,
  FileText,
  Folder,
  KeyRound,
  LoaderCircle,
  Puzzle,
  RefreshCw,
  ScanLine,
  Search,
  ShieldCheck,
  X,
  ZoomIn,
} from "lucide-react";
import { useAppShell } from "../contexts/AppShellContext";
import {
  BrowserFrame,
  BrowserSwitch,
  ChromeIcon,
  Mark,
  Modal,
  ModuleTabs,
  type BrowserKind,
} from "../components/guide/GuideKit";
// 与「智能信息录入」共用同一套简约样式，这里只补充填表助手专用的元素
import "./SmartInformationEntry.css";
import "./ResumeAssistantGuide.css";

type GuideTab = "功能概览" | "安装与配置" | "操作演示" | "常见问题";
type GuideDialog =
  | { kind: "download" }
  | { kind: "copy"; value: string }
  | { kind: "shot"; step: number };
type DemoField = { id: string; label: string; value: string | null; manual?: string };

const DOWNLOAD = "/downloads/Sugar-Resume-Assistant-1.2.0.zip";
const TABS: GuideTab[] = ["功能概览", "安装与配置", "操作演示", "常见问题"];
const STEPS = [
  { title: "下载并解压", short: "下载并解压", image: "" },
  { title: "安装到浏览器", short: "安装到浏览器", image: "install.png" },
  { title: "选择 API 厂商", short: "选择 API 厂商", image: "api-settings.png" },
  { title: "保存简历，开始填表", short: "保存简历，开始填表", image: "resume-editor.png" },
];
const VENDORS = ["DeepSeek", "通义千问", "Kimi", "OpenAI", "智谱 GLM"];
// 操作演示使用的虚构资料
const DEMO_FIELDS: DemoField[] = [
  { id: "name", label: "姓名", value: "林晓" },
  { id: "phone", label: "手机号", value: "138 0000 0000" },
  { id: "email", label: "邮箱", value: "linxiao@example.com" },
  { id: "school", label: "毕业院校", value: "示例大学" },
  { id: "major", label: "专业", value: "工业工程" },
  { id: "degree", label: "学历", value: "本科" },
  { id: "graduation", label: "毕业时间", value: "2027-06" },
  { id: "attachment", label: "简历附件", value: null, manual: "需你手动上传" },
  { id: "captcha", label: "验证码", value: null, manual: "需你手动填写" },
];
const AUTO_FIELDS = DEMO_FIELDS.filter((f) => f.value !== null);
const FAQ = [
  [
    "install",
    "插件无法安装或没有显示？",
    "确认使用桌面版 Chrome / Edge，选择的文件夹包含 manifest.json，并已开启开发者模式。不要直接选择 ZIP，安装后请保留这个文件夹。",
  ],
  [
    "api",
    "API 报错或没有填入内容？",
    "检查密钥对应的厂商、区域、额度和权限，并确认已保存标准简历、当前是招聘表单页面。",
  ],
  [
    "vendors",
    "支持哪些 AI 厂商？需要填写接口地址吗？",
    "支持 DeepSeek、通义千问、Kimi、OpenAI 和智谱 GLM。选择厂商并粘贴自己的 API Key 即可，接口地址和默认模型自动匹配。通义千问使用北京区域密钥，Kimi 使用中国站密钥；API 账户需有可用额度和模型权限。",
  ],
  [
    "storage",
    "资料与 API Key 保存在哪里？",
    "下载包不含任何人的简历或密钥。你的资料和 API Key 保存在当前浏览器中，无需网站配对。",
  ],
  [
    "ai-data",
    "使用 AI 时会发送哪些内容？",
    "使用 AI 映射时，页面字段和简历字段摘要会发送给所选厂商；AI 导入会发送原始简历。",
  ],
  [
    "submit",
    "插件会自动提交申请吗？",
    "不会。插件不会自动上传附件、处理验证码或提交申请。填完后请检查结果，补充附件与遗漏字段，最后由你手动提交。",
  ],
  [
    "update",
    "更新时如何保留资料？",
    "用新版文件替换原目录，在扩展管理页点击重新加载。不要先卸载插件。",
  ],
];
const FAQ_GROUPS: Record<string, string[]> = {
  install: ["install", "update"],
  ai: ["api", "vendors", "ai-data"],
  privacy: ["storage", "ai-data", "submit"],
};

function FillerPreview() {
  return (
    <div
      className="hero-preview"
      aria-label="标准简历填入招聘网页表单的流程示意"
    >
      <div className="mini-sugar">
        <div className="mini-sugar-title">
          <Mark small />
          <span className="badge neutral">标准简历</span>
        </div>
        <div className="mini-record">
          <span className="document-icon">
            <FileText size={20} />
          </span>
          <div>
            <strong>林晓 · 工业工程</strong>
            <p>示例大学 · 2027 届</p>
          </div>
          <span className="badge success">已保存</span>
        </div>
      </div>
      <div className="connect-line">
        <span />
        <ArrowDown size={15} />
      </div>
      <BrowserFrame title="招聘官网 · 网申表单">
        <div className="preview-jobs">
          <h3>星河科技 · 校园招聘</h3>
          {[
            ["姓名", "林晓"],
            ["毕业院校", "示例大学"],
          ].map(([label, value]) => (
            <div className="preview-job selected" key={label}>
              <span className="mock-check">
                <Check size={12} />
              </span>
              <strong>{label}</strong>
              <span className="fill-value">{value}</span>
            </div>
          ))}
          <div className="preview-job">
            <span className="mock-check" />
            <strong>简历附件</strong>
            <span className="fill-value is-manual">由你上传</span>
          </div>
        </div>
      </BrowserFrame>
    </div>
  );
}

export default function ResumeAssistant() {
  const { setHeaderChrome } = useAppShell();
  const [tab, setTab] = useState<GuideTab>("功能概览"),
    [step, setStep] = useState(0),
    [browser, setBrowser] = useState<BrowserKind>("Chrome"),
    [completed, setCompleted] = useState(new Set<number>());
  const [modal, setModal] = useState<GuideDialog | null>(null),
    [notice, setNotice] = useState("");
  const [filledIds, setFilledIds] = useState(new Set<string>()),
    [filling, setFilling] = useState(false);
  const [question, setQuestion] = useState(""),
    [faqOpen, setFaqOpen] = useState("install"),
    [faqCategory, setFaqCategory] = useState("all");
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const fillTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const openDownload = useCallback(() => setModal({ kind: "download" }), []);
  useEffect(() => {
    setHeaderChrome({
      searchPlaceholder: null,
      showAdd: false,
      primaryAction: {
        label: "下载插件",
        onClick: openDownload,
        icon: <Download size={17} />,
      },
    });
    return () => setHeaderChrome(null);
  }, [setHeaderChrome, openDownload]);
  useEffect(
    () => () => {
      clearTimeout(timer.current);
      fillTimers.current.forEach(clearTimeout);
    },
    [],
  );
  useEffect(() => {
    document
      .querySelector(".app-content-scroll")
      ?.scrollTo({ top: 0, behavior: "auto" });
  }, [tab]);
  const toast = (message: string) => {
    setNotice(message);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setNotice(""), 4200);
  };
  function guide(index = 0) {
    setStep(index);
    setTab("安装与配置");
  }
  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast(`已复制 ${value}，请粘贴到浏览器地址栏`);
    } catch {
      setModal({ kind: "copy", value });
    }
  }
  function completeStep() {
    setCompleted((x) => new Set([...x, step]));
    if (step < 3) setStep(step + 1);
    else {
      setTab("操作演示");
      toast("准备好了，试试一次填表演示");
    }
  }
  function resetDemo() {
    fillTimers.current.forEach(clearTimeout);
    fillTimers.current = [];
    setFilling(false);
    setFilledIds(new Set());
  }
  function startFill() {
    if (filling) return;
    resetDemo();
    setFilling(true);
    fillTimers.current = AUTO_FIELDS.map((field, i) =>
      setTimeout(() => {
        setFilledIds((old) => new Set([...old, field.id]));
        if (i === AUTO_FIELDS.length - 1) {
          setFilling(false);
          toast(`已填写 ${AUTO_FIELDS.length} 个字段，请核对后补充附件`);
        }
      }, 220 * (i + 1)),
    );
  }
  const done = !filling && filledIds.size === AUTO_FIELDS.length;
  const filteredFAQ = FAQ.filter(
    ([id, q, a]) =>
      (faqCategory === "all" || FAQ_GROUPS[faqCategory].includes(id)) &&
      `${q}${a}`.toLowerCase().includes(question.toLowerCase()),
  );
  const current = STEPS[step];
  return (
    <div className="smart-input-page filler-page">
      <ModuleTabs
        tabs={TABS}
        value={tab}
        onChange={setTab}
        label="智能填表助手"
        idPrefix="filler-tab"
      />
      <div
        className="module-body"
        id="module-content"
        role="tabpanel"
        aria-labelledby={`filler-tab-${TABS.indexOf(tab)}`}
      >
        {tab === "功能概览" && (
          <>
            <section className="hero">
              <div className="hero-copy">
                <h2>
                  简历填一次，
                  <br />
                  网申轻松一点。
                </h2>
                <p>
                  配置自己的标准简历和 API Key，即可辅助填写招聘网页，
                  <br className="desktop-break" />
                  填完后由你核对并提交。
                </p>
                <div className="hero-actions">
                  <button className="button outline" onClick={() => guide()}>
                    查看安装教程
                  </button>
                  <button
                    className="text-button strong"
                    onClick={() => setTab("操作演示")}
                  >
                    试试操作演示 <ArrowRight size={16} />
                  </button>
                </div>
              </div>
              <FillerPreview />
            </section>
            <section className="quick-start surface">
              <div className="section-header">
                <h2>第一次使用，从这四步开始</h2>
                <button className="text-button" onClick={() => guide()}>
                  查看完整教程 <ArrowRight size={16} />
                </button>
              </div>
              <div className="quick-steps">
                {STEPS.map((s, i) => (
                  <button
                    key={s.title}
                    className="quick-step"
                    onClick={() => guide(i)}
                  >
                    <span className="step-number">0{i + 1}</span>
                    <strong>{s.short}</strong>
                    <ArrowRight className="quick-step-arrow" size={15} />
                  </button>
                ))}
              </div>
            </section>
          </>
        )}
        {tab === "安装与配置" && (
          <>
            <div className="view-heading">
              <div>
                <h2>跟着步骤，装好就能用</h2>
              </div>
              <BrowserSwitch browser={browser} setBrowser={setBrowser} />
            </div>
            <div className="guide-layout">
              <nav className="guide-steps" aria-label="安装步骤">
                {STEPS.map((s, i) => (
                  <button
                    key={s.title}
                    className={`guide-step ${i === step ? "active" : ""}`}
                    aria-current={i === step ? "step" : undefined}
                    onClick={() => setStep(i)}
                  >
                    <span
                      className={`step-index ${completed.has(i) ? "done" : ""}`}
                    >
                      {completed.has(i) ? (
                        <Check size={16} />
                      ) : (
                        String(i + 1).padStart(2, "0")
                      )}
                    </span>
                    <div>
                      <strong>{s.title}</strong>
                    </div>
                    <ChevronRight size={16} />
                  </button>
                ))}
              </nav>
              <article className="guide-detail surface">
                <div className="guide-detail-head">
                  <span>第 {step + 1} / 4 步</span>
                  <span className="browser-name">
                    {browser === "Chrome" ? (
                      <ChromeIcon />
                    ) : (
                      <span className="edge-icon">e</span>
                    )}
                    {browser}
                  </span>
                </div>
                <h3>{current.title}</h3>
                {step === 0 && (
                  <>
                    <p className="guide-description">
                      下载 ZIP 后，解压到电脑上的固定位置。
                      <br />
                      安装时选择下方这一层文件夹。
                    </p>
                    <div className="folder-visual">
                      <div className="folder-head">
                        <Folder size={19} />
                        <strong>Sugar-Resume-Assistant</strong>
                        <span className="badge neutral">选择这一层</span>
                      </div>
                      <div className="folder-files">
                        <span>
                          <FileText size={16} />
                          <b>manifest.json</b>
                          <em>看到这个文件就对了</em>
                        </span>
                        <span>
                          <FileText size={16} />
                          popup.html
                        </span>
                        <span>
                          <Folder size={16} />
                          shared
                        </span>
                        <span>
                          <Folder size={16} />
                          icons
                        </span>
                      </div>
                    </div>
                    <div className="info-line">
                      <AlertCircle size={16} />
                      <p>不要直接选择 ZIP。安装后请保留这个文件夹。</p>
                    </div>
                    <button
                      className="text-button accent-link"
                      onClick={openDownload}
                    >
                      还没下载？获取插件安装包 <ArrowRight size={14} />
                    </button>
                  </>
                )}
                {step === 1 && (
                  <>
                    <p className="guide-description">
                      把下方地址粘贴到 {browser} 地址栏，打开扩展管理页。
                    </p>
                    <div className="copy-field">
                      <code>{browser.toLowerCase()}://extensions</code>
                      <button
                        aria-label="复制扩展管理地址"
                        onClick={() =>
                          copy(`${browser.toLowerCase()}://extensions`)
                        }
                      >
                        <Copy size={15} />
                        复制地址
                      </button>
                    </div>
                    <ol className="instructions">
                      <li>开启「开发者模式」。</li>
                      <li>
                        点击「加载已解压的扩展程序」，选择含 manifest.json
                        的文件夹。
                      </li>
                      <li>在扩展菜单中固定「Sugar 智能填表助手」。</li>
                    </ol>
                  </>
                )}
                {step === 2 && (
                  <>
                    <p className="guide-description">
                      点击插件右上角齿轮，进入「API 设置」，
                      <br />
                      点击「配置 API」或「添加 API 厂商」。
                    </p>
                    <ol className="instructions">
                      <li>选择你已经开通 API 的厂商。</li>
                      <li>粘贴该厂商的 API Key，点击保存，即会自动启用。</li>
                    </ol>
                    <div className="filler-vendors">
                      {VENDORS.map((name) => (
                        <span className="badge neutral" key={name}>
                          <Check size={12} />
                          {name}
                        </span>
                      ))}
                    </div>
                  </>
                )}
                {step === 3 && (
                  <ol className="instructions">
                    <li>在插件中打开「标准简历」→「打开简历配置页」。</li>
                    <li>
                      填写自己的资料，点击「保存标准简历」。也可以用 AI
                      导入自己的文本或 PDF，再核对保存。
                    </li>
                    <li>
                      打开招聘网站的表单页，点击插件图标，再点击「开始填充」。
                    </li>
                    <li>检查填写结果，补充附件与遗漏字段，最后手动提交。</li>
                  </ol>
                )}
                {current.image && (
                  <button
                    type="button"
                    className="filler-shot"
                    onClick={() => setModal({ kind: "shot", step })}
                    aria-label={`放大${current.title}截图`}
                  >
                    <img
                      src={`/guides/resume-assistant/${current.image}`}
                      alt={`${current.title}实际操作截图，使用空白演示资料`}
                    />
                    <span>
                      <ZoomIn size={14} />
                      实际操作截图 · 点击放大
                    </span>
                  </button>
                )}
                {step === 1 && (
                  <div className="info-line">
                    <AlertCircle size={16} />
                    <p>截图为 Chrome；Edge 的入口位置略有不同，步骤相同。</p>
                  </div>
                )}
                {step === 2 && (
                  <div className="info-line">
                    <AlertCircle size={16} />
                    <p>
                      接口地址和默认模型自动匹配，无需填写。通义千问使用北京区域密钥，Kimi
                      使用中国站密钥；API 账户需有可用额度和模型权限。
                    </p>
                  </div>
                )}
                {step === 3 && (
                  <div className="info-line">
                    <ShieldCheck size={16} />
                    <p>
                      只补空白字段可用「增量填入」；只填局部可用「选区填入」。插件不会自动上传附件、处理验证码或提交申请。
                    </p>
                  </div>
                )}
                <footer className="guide-bottom">
                  <span>{completed.size} / 4 步已确认</span>
                  <button className="button outline" onClick={completeStep}>
                    {step === 3 ? "完成，试试填表" : "完成，下一步"}{" "}
                    <ArrowRight size={15} />
                  </button>
                </footer>
              </article>
            </div>
          </>
        )}
        {tab === "操作演示" && (
          <>
            <div className="view-heading">
              <div>
                <h2>打开网申表单，体验一次填写</h2>
              </div>
              <button
                className="text-button"
                onClick={() => {
                  resetDemo();
                  toast("演示已重置");
                }}
              >
                <RefreshCw size={15} />
                重置演示
              </button>
            </div>
            <div className="demo-layout">
              <section className="demo-browser surface">
                <BrowserFrame title="careers.example · 网申表单">
                  <div className="fictional-company">
                    <span className="company-monogram">星</span>
                    <div>
                      <h3>星河科技</h3>
                    </div>
                    <span className="badge neutral">虚构公司</span>
                  </div>
                  <div className="demo-company-header">
                    <h4>2027 校园招聘 · 网申表单</h4>
                    <span>{DEMO_FIELDS.length} 个字段</span>
                  </div>
                  <div className="fill-form">
                    {DEMO_FIELDS.map((field) => {
                      const filled = filledIds.has(field.id);
                      const manual = Boolean(field.manual) && done;
                      return (
                        <div
                          className={`fill-field${filled ? " is-filled" : ""}${manual ? " is-manual" : ""}`}
                          key={field.id}
                        >
                          <span>{field.label}</span>
                          <div className="fill-input">
                            {filled ? field.value : manual ? field.manual : ""}
                            {filled && <Check size={14} />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="fill-submit">
                    <span>核对无误后，由你点击提交</span>
                    <span className="fill-submit-button">提交申请</span>
                  </div>
                </BrowserFrame>
              </section>
              <section className="demo-panel surface" aria-label="插件操作演示">
                <header>
                  <span className="extension-logo">S</span>
                  <div>
                    <strong>Sugar 智能填表助手</strong>
                    <small>
                      <span className="connection-dot" />
                      教学练习 · 不会提交任何内容
                    </small>
                  </div>
                </header>
                <div className="recognition-state">
                  <ScanLine size={19} className={filling ? "pulse" : ""} />
                  <div>
                    <strong>
                      {filling
                        ? "正在按标准简历填写…"
                        : done
                          ? `已填写 ${AUTO_FIELDS.length} 个字段`
                          : `识别到 ${DEMO_FIELDS.length} 个表单字段`}
                    </strong>
                  </div>
                </div>
                <div className="fill-checklist">
                  {done ? (
                    <>
                      <h4>还需要你处理</h4>
                      {DEMO_FIELDS.filter((f) => f.manual).map((f) => (
                        <div className="fill-todo" key={f.id}>
                          <AlertCircle size={15} />
                          {f.label} · {f.manual}
                        </div>
                      ))}
                      <div className="fill-todo ok">
                        <CheckCircle2 size={15} />
                        其余字段已按标准简历填写，请逐项核对
                      </div>
                    </>
                  ) : (
                    <>
                      <h4>正式使用时</h4>
                      <ol className="instructions">
                        <li>打开招聘网站的网申表单页。</li>
                        <li>点击插件图标，再点击「开始填充」。</li>
                        <li>核对结果，补充附件与遗漏字段。</li>
                        <li>确认无误后，由你手动提交。</li>
                      </ol>
                    </>
                  )}
                </div>
                <div className="panel-save">
                  <div>
                    <strong>
                      已填写 <em>{filledIds.size}</em> / {AUTO_FIELDS.length} 项
                    </strong>
                  </div>
                  <button
                    className="button outline full"
                    disabled={filling}
                    onClick={done ? resetDemo : startFill}
                  >
                    {filling ? (
                      <>
                        <LoaderCircle size={15} className="spin" />
                        正在填写…
                      </>
                    ) : done ? (
                      <>
                        <RefreshCw size={15} />
                        再演示一次
                      </>
                    ) : (
                      <>
                        <Check size={15} />
                        开始填充
                      </>
                    )}
                  </button>
                  <p>附件和验证码需要你自己处理，核对后再手动提交。</p>
                </div>
              </section>
            </div>
          </>
        )}
        {tab === "常见问题" && (
          <>
            <div className="faq-heading">
              <div>
                <h2>把疑问，留在开始之前</h2>
              </div>
              <div className="faq-search">
                <Search size={17} />
                <input
                  placeholder="搜索问题，例如：API"
                  aria-label="搜索常见问题"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                />
                {question && (
                  <button
                    className="icon-button"
                    aria-label="清空问题搜索"
                    onClick={() => setQuestion("")}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
            <div className="faq-layout">
              <nav className="faq-categories" aria-label="常见问题分类">
                {(
                  [
                    ["all", "全部问题", CircleHelp],
                    ["install", "安装与更新", Puzzle],
                    ["ai", "AI 与密钥", KeyRound],
                    ["privacy", "资料与隐私", ShieldCheck],
                  ] as const
                ).map(([id, label, Icon]) => (
                  <button
                    key={id}
                    className={faqCategory === id ? "active" : ""}
                    aria-pressed={faqCategory === id}
                    onClick={() => setFaqCategory(id)}
                  >
                    <Icon size={16} />
                    {label}
                    <ChevronRight size={14} />
                  </button>
                ))}
              </nav>
              <div className="faq-list surface">
                {filteredFAQ.length ? (
                  filteredFAQ.map(([id, q, a]) => (
                    <article className={faqOpen === id ? "open" : ""} key={id}>
                      <h3>
                        <button
                          aria-expanded={faqOpen === id}
                          aria-controls={`faq-${id}`}
                          onClick={() => setFaqOpen(faqOpen === id ? "" : id)}
                        >
                          {q}
                          <ChevronDown size={17} />
                        </button>
                      </h3>
                      <div id={`faq-${id}`} hidden={faqOpen !== id}>
                        <p>{a}</p>
                        {id === "install" && (
                          <button
                            className="text-button"
                            onClick={() => guide(1)}
                          >
                            查看安装步骤 <ArrowRight size={14} />
                          </button>
                        )}
                        {id === "submit" && (
                          <button
                            className="text-button"
                            onClick={() => setTab("操作演示")}
                          >
                            试试填表演示 <ArrowRight size={14} />
                          </button>
                        )}
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="no-results">
                    <Search size={26} />
                    <h3>没有找到匹配的问题</h3>
                    <p>试试「安装」「API」「附件」等关键词。</p>
                    <button
                      className="text-button"
                      onClick={() => {
                        setQuestion("");
                        setFaqCategory("all");
                      }}
                    >
                      查看全部问题 <ArrowRight size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
        <p className="filler-license">
          基于 AI Resume Form Filling Assistant 修改 · GPL-3.0 ·
          完整扩展源码与许可证随下载包提供
        </p>
      </div>
      {modal && (
        <Modal
          title={
            modal.kind === "download"
              ? "下载 Sugar 智能填表助手"
              : modal.kind === "copy"
                ? "复制扩展管理地址"
                : STEPS[modal.step].title
          }
          onClose={() => setModal(null)}
          wide={modal.kind === "shot"}
        >
          {modal.kind === "download" ? (
            <div className="modal-body">
              <div className="download-product">
                <span className="extension-logo large">S</span>
                <div>
                  <h3>Sugar 智能填表助手</h3>
                </div>
                <span className="badge neutral">ZIP 安装包</span>
              </div>
              <p>
                v1.2.0，适用于电脑端 Chrome / Edge
                114+。下载后先解压，再到浏览器扩展管理页加载。
              </p>
              <BrowserSwitch browser={browser} setBrowser={setBrowser} />
              <a
                className="button primary full"
                href={DOWNLOAD}
                download="Sugar-Resume-Assistant-1.2.0.zip"
                onClick={() => toast("插件 ZIP 已开始下载，下载后请解压")}
              >
                <Download size={16} />
                下载 {browser} 安装包
              </a>
              <button
                className="text-button full"
                onClick={() => {
                  setModal(null);
                  guide(1);
                }}
              >
                下载后，查看安装步骤 <ArrowRight size={15} />
              </button>
            </div>
          ) : modal.kind === "copy" ? (
            <div className="modal-body">
              <p>浏览器未开放剪贴板权限，请选中并复制下方地址：</p>
              <input
                className="fallback-copy"
                readOnly
                value={modal.value}
                onFocus={(e) => e.target.select()}
              />
            </div>
          ) : (
            <div className="modal-body">
              <img
                className="filler-zoom"
                src={`/guides/resume-assistant/${STEPS[modal.step].image}`}
                alt={`${STEPS[modal.step].title}放大截图`}
              />
            </div>
          )}
        </Modal>
      )}
      {notice && (
        <div className="toast" role="status">
          <CheckCircle2 size={17} />
          {notice}
        </div>
      )}
    </div>
  );
}
