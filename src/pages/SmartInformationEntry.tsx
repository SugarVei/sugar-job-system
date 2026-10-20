import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ChevronDown,
  ChevronRight,
  ArrowRight,
  ArrowDown,
  Download,
  Check,
  Copy,
  X,
  ShieldCheck,
  MapPin,
  Folder,
  Puzzle,
  CircleUserRound,
  Settings2,
  Search,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  FileText,
  LogIn,
  KeyRound,
  LoaderCircle,
  ScanLine,
  CircleHelp,
} from "lucide-react";
import { useAppShell } from "../contexts/AppShellContext";
import "./SmartInformationEntry.css";

type GuideTab = "功能概览" | "安装与配置" | "操作演示" | "常见问题";
type BrowserKind = "Chrome" | "Edge";
type DemoJob = {
  id: string;
  company: string;
  title: string;
  city: string;
  code: string;
  team: string;
  description: string;
};
type GuideDialog =
  | { kind: "download" }
  | { kind: "copy"; value: string }
  | { kind: "account" };
const DOWNLOAD = "/downloads/Sugar-Job-Assistant-2.0.1.zip";
const TABS: GuideTab[] = ["功能概览", "安装与配置", "操作演示", "常见问题"];
const STEPS = [
  { title: "下载并解压", desc: "保留插件文件夹", short: "下载并解压" },
  {
    title: "安装到浏览器",
    desc: "开启开发者模式并加载",
    short: "安装到浏览器",
  },
  { title: "登录你的账号", desc: "关联自己的投递管理", short: "登录与配置" },
  {
    title: "配置 AI 与授权",
    desc: "接入个人 AI，授权招聘网站",
    short: "配置 AI 与授权",
  },
];
const SAMPLE_JOBS: DemoJob[] = [
  {
    id: "a",
    company: "星河科技",
    title: "数据分析实习生",
    city: "上海",
    code: "DA-2027",
    team: "数据与决策",
    description:
      "参与业务数据分析与指标体系建设，使用 SQL 整理数据，协助制作可视化报告。",
  },
  {
    id: "b",
    company: "星河科技",
    title: "产品运营实习生",
    city: "杭州",
    code: "PO-2027",
    team: "产品与用户",
    description:
      "参与用户调研、产品活动策划和运营数据复盘，整理反馈并跟进产品改进。",
  },
  {
    id: "c",
    company: "云杉咨询",
    title: "商业分析实习生",
    city: "北京",
    code: "BA-2027",
    team: "咨询与研究",
    description: "开展行业研究，整理访谈资料，参与商业分析和项目报告撰写。",
  },
];
const FAQ = [
  [
    "install",
    "如何在 Chrome 或 Edge 中安装？",
    "先下载并解压 ZIP，再打开浏览器扩展管理页，开启「开发者模式」，点击「加载已解压的扩展程序」，选择包含 manifest.json 的 Sugar-Job-Assistant 文件夹。安装后保留该文件夹，不要直接加载 ZIP。",
  ],
  [
    "account",
    "必须登录简历网站的账号吗？",
    "需要。插件使用 Sugar 网站的同一邮箱和密码登录，识别后的岗位只会保存到当前登录用户的投递管理。未登录不能同步；网站也请登录同一账号查看。",
  ],
  [
    "ai",
    "AI 需要自己配置吗？",
    "需要使用自己的 API Key。插件支持 DeepSeek、通义千问、Kimi、OpenAI 和智谱 GLM 等厂商预设。保存个人配置、允许发送招聘页面片段后即可使用；模型费用由对应厂商按你的 API 账户计费。未配置时仍可使用基础提取。",
  ],
  [
    "company",
    "公司名称显示「待补全」怎么办？",
    "新版会结合页眉、Logo 替代文字、页面标题和 AI 识别招聘公司。可以点击「自动补全公司名称」，记录同步时也会自动尝试补全。若仍缺乏可靠依据，进入岗位详情手动修正后再保存。",
  ],
  [
    "sync",
    "为什么网站里没有出现刚才的记录？",
    "请先查看插件中的同步状态。只有「已同步」表示已取得网站保存确认；「待同步」可在网络恢复后重试。确认两端登录同一账号，再刷新网站投递管理。重复记录会保留原有面试阶段。",
  ],
  [
    "privacy",
    "插件会读取什么，数据保存在哪里？",
    "授权后，插件读取招聘网页的岗位、公司和相关公开片段，默认过滤表单输入、邮箱、手机号及登录凭证。启用 AI 时，这些片段会发送给你选择的厂商。登录会话保存在扩展私有存储，投递记录归属于本人网站账号。",
  ],
  [
    "update",
    "更新插件会丢失登录与配置吗？",
    "用新版文件覆盖原来的扩展目录，再到扩展管理页点击「重新加载」。保持原目录和扩展 ID，可以保留原有登录、个人 AI 配置和本地待同步记录。请先处理待同步记录，再考虑卸载。",
  ],
  [
    "support",
    "支持所有招聘网站吗？",
    "支持结构化岗位数据、常见岗位卡片及 AI 辅助识别。特殊招聘系统、跨域内嵌页面或验证码可能影响提取。首次使用新网站时，请核对公司、岗位和城市，缺失字段可手动补充。",
  ],
];
function Mark({ small = false }: { small?: boolean }) {
  return (
    <span className={`brand ${small ? "brand-small" : ""}`}>
      <img src="/sugar-logo-v2.png" alt="" />
      <span>Sugar</span>
    </span>
  );
}
function ChromeIcon() {
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
function BrowserSwitch({
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
function BrowserFrame({
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
function HeroPreview() {
  return (
    <div
      className="hero-preview"
      aria-label="岗位从招聘网页同步到 Sugar 的流程示意"
    >
      <BrowserFrame title="招聘官网">
        <div className="preview-jobs">
          <h3>星河科技 · 校园招聘</h3>
          {SAMPLE_JOBS.slice(0, 2).map((j, i) => (
            <div
              className={`preview-job ${i === 0 ? "selected" : ""}`}
              key={j.id}
            >
              <span className="mock-check">
                {i === 0 && <Check size={12} />}
              </span>
              <strong>{j.title}</strong>
              <span className="location">
                <MapPin size={13} />
                {j.city}
              </span>
              <ChevronRight size={16} />
            </div>
          ))}
        </div>
      </BrowserFrame>
      <div className="connect-line">
        <span />
        <ArrowDown size={15} />
      </div>
      <div className="mini-sugar">
        <div className="mini-sugar-title">
          <Mark small />
          <div className="skeleton-lines">
            <i />
            <i />
          </div>
        </div>
        <div className="mini-record">
          <span className="document-icon">
            <FileText size={20} />
          </span>
          <div>
            <strong>数据分析实习生</strong>
            <p>星河科技 · 校园招聘</p>
          </div>
          <span className="record-city">
            <MapPin size={13} />
            上海
          </span>
          <span className="badge success">已投递</span>
        </div>
      </div>
    </div>
  );
}
function Modal({
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
export default function SmartInformationEntry() {
  const { setHeaderChrome } = useAppShell();
  const [tab, setTab] = useState<GuideTab>("功能概览"),
    [step, setStep] = useState(0),
    [browser, setBrowser] = useState<BrowserKind>("Chrome");
  const [modal, setModal] = useState<GuideDialog | null>(null),
    [notice, setNotice] = useState("");
  const [checked, setChecked] = useState(new Set(["a"])),
    [records, setRecords] = useState<DemoJob[]>([]),
    [saving, setSaving] = useState(false),
    [recognizing, setRecognizing] = useState(false),
    [demoView, setDemoView] = useState("page"),
    [demoSearch, setDemoSearch] = useState(""),
    [question, setQuestion] = useState(""),
    [faqOpen, setFaqOpen] = useState("install"),
    [faqCategory, setFaqCategory] = useState("all"),
    [completed, setCompleted] = useState(new Set<number>());
  const timer = useRef<ReturnType<typeof setTimeout>>(),
    [detail, setDetail] = useState<DemoJob | null>(null);
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
  useEffect(() => () => clearTimeout(timer.current), []);
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
  function go(next: GuideTab) {
    setTab(next);
  }
  function guide(index = 0) {
    setStep(index);
    go("安装与配置");
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
      go("操作演示");
      toast("准备好了，试试选择一个已投递岗位");
    }
  }
  function toggleJob(id: string) {
    setChecked((old) => {
      const next = new Set(old);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  async function saveDemo() {
    if (!checked.size || saving) return;
    setSaving(true);
    await new Promise((r) => setTimeout(r, 650));
    const chosen = SAMPLE_JOBS.filter(
      (j) => checked.has(j.id) && !records.some((r) => r.id === j.id),
    );
    setRecords((old) => [...old, ...chosen]);
    setChecked(new Set());
    setSaving(false);
    toast(`已保存 ${chosen.length} 个练习岗位，真实投递未写入`);
  }
  async function recognize() {
    if (recognizing) return;
    setRecognizing(true);
    await new Promise((r) => setTimeout(r, 650));
    setRecognizing(false);
    toast("已识别 3 个演示岗位，请勾选你已经投递的岗位");
  }
  const remaining = SAMPLE_JOBS.filter(
    (j) => !records.some((r) => r.id === j.id),
  );
  const filteredFAQ = FAQ.filter(
    ([id, q, a]) =>
      (faqCategory === "all" ||
        (faqCategory === "start"
          ? ["install", "account", "ai", "update"].includes(id)
          : faqCategory === "recognize"
            ? ["company", "support", "ai"].includes(id)
            : ["sync", "privacy", "account"].includes(id))) &&
      `${q}${a}`.toLowerCase().includes(question.toLowerCase()),
  );
  return (
    <div className="smart-input-page">
      <div className="module-intro">
        <p>安装一次，让招聘网页和你的投递记录连起来。</p>
        <span>v2.0.1 · 电脑端 Chrome / Edge</span>
      </div>
      <div
        className="module-tabs"
        role="tablist"
        aria-label="智能信息录入"
        onKeyDown={(e) => {
          if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key))
            return;
          e.preventDefault();
          const focusedIndex = Array.from(e.currentTarget.children).findIndex(
            (child) => child.contains(e.target as Node),
          );
          const i = focusedIndex < 0 ? TABS.indexOf(tab) : focusedIndex,
            next =
              e.key === "Home"
                ? 0
                : e.key === "End"
                  ? TABS.length - 1
                  : (i + (e.key === "ArrowRight" ? 1 : -1) + TABS.length) %
                    TABS.length;
          go(TABS[next]);
          (e.currentTarget.children[next] as HTMLElement | undefined)?.focus();
        }}
      >
        {TABS.map((t, index) => (
          <button
            key={t}
            id={`smart-input-tab-${index}`}
            role="tab"
            tabIndex={tab === t ? 0 : -1}
            aria-selected={tab === t}
            aria-controls="module-content"
            className={tab === t ? "active" : ""}
            onClick={() => go(t)}
          >
            {t}
          </button>
        ))}
      </div>
      <div
        className="module-body"
        id="module-content"
        role="tabpanel"
        aria-labelledby={`smart-input-tab-${TABS.indexOf(tab)}`}
      >
        {tab === "功能概览" && (
          <>
            <section className="hero">
              <div className="hero-copy">
                <h2>
                  投递之后，
                  <br />
                  记录自动到位。
                </h2>
                <p>
                  在招聘网站识别岗位，勾选你已经投递的职位，
                  <br className="desktop-break" />
                  保存到自己的 Sugar 账号。
                </p>
                <div className="hero-actions">
                  <button className="button outline" onClick={() => guide()}>
                    查看安装教程
                  </button>
                  <button
                    className="text-button strong"
                    onClick={() => go("操作演示")}
                  >
                    试试操作演示 <ArrowRight size={16} />
                  </button>
                </div>
                <div className="hero-note">
                  AI 服务由你配置，记录前由你确认。
                </div>
              </div>
              <HeroPreview />
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
                    <p>
                      {
                        [
                          "保留插件文件夹。",
                          "开启开发者模式并加载。",
                          "使用网站账号，接入个人 AI。",
                          "保存个人 AI 配置，授权招聘网站。",
                        ][i]
                      }
                    </p>
                    <ArrowRight className="quick-step-arrow" size={15} />
                  </button>
                ))}
              </div>
            </section>
            <section className="privacy-strip">
              <ShieldCheck size={22} />
              <span>你的投递，只保存到你自己的账号。</span>
              <button
                className="text-button"
                onClick={() => {
                  setQuestion("");
                  setFaqCategory("sync");
                  setFaqOpen("privacy");
                  go("常见问题");
                }}
              >
                了解数据与权限 <ArrowRight size={16} />
              </button>
            </section>
          </>
        )}
        {tab === "安装与配置" && (
          <>
            <div className="view-heading">
              <div>
                <h2>跟着步骤，装好就能用</h2>
                <p>已经完成的步骤可以跳过，配置会保留在你的浏览器中。</p>
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
                      <p>{s.desc}</p>
                    </div>
                    <ChevronRight size={16} />
                  </button>
                ))}
                <div className="guide-support">
                  <CircleHelp size={17} />
                  <div>
                    <strong>遇到问题也没关系</strong>
                    <p>常见问题里有对应解决方法。</p>
                    <button
                      className="text-button"
                      onClick={() => go("常见问题")}
                    >
                      查看帮助 <ArrowRight size={13} />
                    </button>
                  </div>
                </div>
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
                <h3>{STEPS[step].title}</h3>
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
                        <strong>Sugar-Job-Assistant</strong>
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
                          tracker.html
                        </span>
                        <span>
                          <Folder size={16} />
                          tracker
                        </span>
                        <span>
                          <Folder size={16} />
                          icons
                        </span>
                      </div>
                    </div>
                    <div className="info-line">
                      <AlertCircle size={16} />
                      <p>
                        不要选择
                        ZIP，也不要选择外层说明文件夹。安装后请保留该目录。
                      </p>
                    </div>
                    <button
                      className="text-button accent-link"
                      onClick={() => setModal({ kind: "download" })}
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
                    <div className="extension-install-visual">
                      <div className="extension-toolbar">
                        <span>
                          <Puzzle size={16} />
                          扩展程序
                        </span>
                        <label>
                          开发者模式 <span className="mock-toggle" />
                        </label>
                      </div>
                      <div className="extension-actions">
                        <span className="mock-load">加载已解压的扩展程序</span>
                        <span>打包扩展程序</span>
                        <span>更新</span>
                      </div>
                      <div className="extension-example">
                        <span className="extension-logo">S</span>
                        <div>
                          <strong>Sugar 求职助手</strong>
                          <small>2.0.1 · 已加载</small>
                        </div>
                        <CheckCircle2 size={17} />
                      </div>
                    </div>
                    <ol className="instructions">
                      <li>开启右上角的「开发者模式」。</li>
                      <li>点击「加载已解压的扩展程序」，选择插件文件夹。</li>
                      <li>
                        在扩展菜单中固定「Sugar 求职助手」，方便下次打开。
                      </li>
                    </ol>
                  </>
                )}
                {step === 2 && (
                  <>
                    <p className="guide-description">
                      使用 Sugar 简历网站的同一账号登录，
                      <br />
                      识别的岗位才能保存到你自己的投递管理。
                    </p>
                    <div className="login-visual">
                      <div>
                        <Mark small />
                        <span className="badge neutral">插件侧栏示意</span>
                      </div>
                      <h4>连接你的求职记录</h4>
                      <label>
                        网站账号邮箱<span>你的 Sugar 注册邮箱</span>
                      </label>
                      <label>
                        密码<span className="mock-password">••••••••••••</span>
                      </label>
                      <div className="mock-black-button">
                        <LogIn size={14} />
                        登录并关联 Sugar
                      </div>
                      <p>使用网站同一账号，无需另建插件账号。</p>
                    </div>
                    <div className="info-line">
                      <ShieldCheck size={16} />
                      <p>
                        未登录不能同步。插件不保存密码，登录会话保存在扩展私有存储中。
                      </p>
                    </div>
                  </>
                )}
                {step === 3 && (
                  <>
                    <p className="guide-description">
                      在插件设置中选择 AI 厂商，保存自己的 API Key；
                      <br />
                      随后授权需要识别的招聘网站。
                    </p>
                    <div className="settings-visual">
                      <div className="settings-visual-title">
                        <Settings2 size={16} />
                        <strong>AI 识别设置</strong>
                      </div>
                      <div className="settings-visual-row">
                        <span>模型厂商</span>
                        <span className="mock-field">
                          DeepSeek <ChevronDown size={13} />
                        </span>
                      </div>
                      <div className="settings-visual-row">
                        <span>个人 API Key</span>
                        <span className="mock-field">
                          ••••••••••••••• <KeyRound size={13} />
                        </span>
                      </div>
                      <div className="check-line">
                        <Check size={13} />
                        允许发送经过过滤的招聘页面片段
                      </div>
                      <div className="settings-hint">
                        接口地址和默认模型由厂商预设自动匹配。
                      </div>
                      <div className="site-permission">
                        <ShieldCheck size={18} />
                        <div>
                          <strong>授权当前招聘网站</strong>
                          <p>首次进入招聘网页时，在插件中授权即可。</p>
                        </div>
                        <CheckCircle2 size={17} />
                      </div>
                    </div>
                    <div className="info-line">
                      <AlertCircle size={16} />
                      <p>
                        AI
                        费用由你自己的厂商账户承担。未配置时可用基础提取，识别结果仍需核对。
                      </p>
                    </div>
                  </>
                )}
                <footer className="guide-bottom">
                  <span>{completed.size} / 4 步已确认</span>
                  <button className="button outline" onClick={completeStep}>
                    {step === 3 ? "完成，试试同步" : "完成，下一步"}{" "}
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
                <h2>选一个岗位，体验一次同步</h2>
                <p>下面使用虚构岗位演示，操作不会写入你的真实账号。</p>
              </div>
              <button
                className="text-button"
                onClick={() => {
                  setRecords([]);
                  setChecked(new Set(["a"]));
                  setDemoView("page");
                  toast("演示已重置");
                }}
              >
                <RefreshCw size={15} />
                重置演示
              </button>
            </div>
            <div className="demo-layout">
              <section className="demo-browser surface">
                <BrowserFrame title="careers.example · 招聘网页">
                  <div className="fictional-company">
                    <span className="company-monogram">星</span>
                    <div>
                      <h3>星河科技</h3>
                      <p>2027 校园招聘 · 演示页面</p>
                    </div>
                    <span className="badge neutral">虚构公司</span>
                  </div>
                  <div className="demo-company-header">
                    <h4>寻找你的下一站</h4>
                    <span>{SAMPLE_JOBS.length} 个演示岗位</span>
                  </div>
                  {SAMPLE_JOBS.map((j) => (
                    <article className="website-job" key={j.id}>
                      <div>
                        <span className="website-job-company">
                          {j.company} · {j.team}
                        </span>
                        <h4>{j.title}</h4>
                        <p>
                          <MapPin size={13} />
                          {j.city} · 校园招聘 · {j.code}
                        </p>
                      </div>
                      <button
                        className="icon-button"
                        aria-label={`查看${j.title}详情`}
                        onClick={() => setDetail(j)}
                      >
                        <ArrowRight size={17} />
                      </button>
                    </article>
                  ))}
                  <p className="website-example-note">
                    页面已加载 → 插件识别 → 你来确认 → 同步记录
                  </p>
                </BrowserFrame>
                <div className="data-boundary">
                  <ShieldCheck size={17} />
                  <span>识别和勾选不会自动新增投递。</span>
                </div>
              </section>
              <section className="demo-panel surface" aria-label="插件操作演示">
                <header>
                  <span className="extension-logo">S</span>
                  <div>
                    <strong>Sugar 求职助手</strong>
                    <small>
                      <span className="connection-dot" />
                      教学练习 · 不写入账号
                    </small>
                  </div>
                  <button
                    className="icon-button"
                    aria-label="演示账号说明"
                    onClick={() => setModal({ kind: "account" })}
                  >
                    <CircleUserRound size={17} />
                  </button>
                </header>
                <div className="panel-tabs">
                  <button
                    className={demoView === "page" ? "active" : ""}
                    onClick={() => setDemoView("page")}
                  >
                    本页岗位
                  </button>
                  <button
                    className={demoView === "records" ? "active" : ""}
                    onClick={() => setDemoView("records")}
                  >
                    投递记录
                    {records.length > 0 && <span>{records.length}</span>}
                  </button>
                </div>
                {demoView === "page" ? (
                  <>
                    <div className="recognition-state">
                      <ScanLine
                        size={19}
                        className={recognizing ? "pulse" : ""}
                      />
                      <div>
                        <strong>
                          {recognizing ? "正在识别岗位…" : "已识别 3 个岗位"}
                        </strong>
                        <p>公司、岗位与城市已整理，待你确认。</p>
                      </div>
                    </div>
                    <div className="panel-tools">
                      <label>
                        <input
                          type="checkbox"
                          aria-label="全选未记录岗位"
                          checked={
                            remaining.length > 0 &&
                            remaining.every((j) => checked.has(j.id))
                          }
                          disabled={!remaining.length || saving}
                          onChange={(e) =>
                            setChecked(
                              new Set(
                                e.target.checked
                                  ? remaining.map((j) => j.id)
                                  : [],
                              ),
                            )
                          }
                        />
                        全选
                      </label>
                      <button
                        className="text-button"
                        disabled={saving || recognizing}
                        onClick={recognize}
                      >
                        <RefreshCw size={12} />
                        重新识别
                      </button>
                    </div>
                    <div className="panel-search">
                      <Search size={14} />
                      <input
                        aria-label="搜索演示岗位"
                        placeholder="搜索岗位、公司、城市"
                        value={demoSearch}
                        onChange={(e) => setDemoSearch(e.target.value)}
                      />
                    </div>
                    <div className="panel-job-list">
                      {SAMPLE_JOBS.filter((j) =>
                        `${j.company}${j.title}${j.city}`.includes(demoSearch),
                      ).map((j) => {
                        const saved = records.some((r) => r.id === j.id);
                        return (
                          <label
                            className={`panel-job ${checked.has(j.id) ? "checked" : ""}`}
                            key={j.id}
                          >
                            <input
                              type="checkbox"
                              aria-label={`选择${j.title}`}
                              checked={checked.has(j.id)}
                              disabled={saved || saving}
                              onChange={() => toggleJob(j.id)}
                            />
                            <span>
                              <small>{j.company}</small>
                              <strong>{j.title}</strong>
                              <p>
                                {j.city} · {j.code}
                              </p>
                            </span>
                            {saved ? (
                              <span className="badge success">
                                <Check size={11} />
                                已同步
                              </span>
                            ) : (
                              <button
                                className="icon-button"
                                aria-label={`在插件中查看${j.title}`}
                                onClick={(e) => {
                                  e.preventDefault();
                                  setDetail(j);
                                }}
                              >
                                <ChevronRight size={14} />
                              </button>
                            )}
                          </label>
                        );
                      })}
                    </div>
                    <div className="panel-save">
                      <div>
                        <strong>
                          已选择 <em>{checked.size}</em> 个岗位
                        </strong>
                        <small>只记录你已投递的职位</small>
                      </div>
                      <button
                        className="button outline full"
                        disabled={!checked.size || saving}
                        onClick={saveDemo}
                      >
                        {saving ? (
                          <>
                            <LoaderCircle size={15} className="spin" />
                            正在同步…
                          </>
                        ) : (
                          <>
                            <Check size={15} />
                            记录并同步
                          </>
                        )}
                      </button>
                      <p>练习记录 · 仅在当前页面生效</p>
                    </div>
                  </>
                ) : (
                  <div className="panel-records">
                    {records.length ? (
                      records.map((j) => (
                        <article key={j.id}>
                          <span className="record-icon">
                            <FileText size={18} />
                          </span>
                          <div>
                            <strong>{j.title}</strong>
                            <p>
                              {j.company} · {j.city}
                            </p>
                          </div>
                          <span className="badge success">已同步</span>
                        </article>
                      ))
                    ) : (
                      <div className="empty-records">
                        <FileText size={28} />
                        <h4>还没有演示记录</h4>
                        <p>先去「本页岗位」勾选职位，再点击记录并同步。</p>
                        <button
                          className="text-button"
                          onClick={() => setDemoView("page")}
                        >
                          返回本页岗位 <ArrowRight size={14} />
                        </button>
                      </div>
                    )}
                    <button
                      className="text-button"
                      onClick={() =>
                        toast(
                          "正式使用时，已同步记录会显示在网站投递管理。上方练习记录不会写入真实投递。",
                        )
                      }
                    >
                      如何查看真实投递？ <ArrowRight size={14} />
                    </button>
                  </div>
                )}
              </section>
            </div>
            <div className="demo-tip">
              <CheckCircle2 size={19} />
              <p>
                <strong>同步由你确认，投递进度继续在网站管理。</strong>
                <span>重复记录会检查已有岗位，保留原来的面试阶段。</span>
              </p>
              <button className="text-button" onClick={() => guide(2)}>
                查看账号关联方式 <ArrowRight size={15} />
              </button>
            </div>
          </>
        )}
        {tab === "常见问题" && (
          <>
            <div className="faq-heading">
              <div>
                <h2>把疑问，留在开始之前</h2>
                <p>安装、识别和同步中常见的问题，都在这里。</p>
              </div>
              <div className="faq-search">
                <Search size={17} />
                <input
                  placeholder="搜索问题，例如：公司名称"
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
                    ["start", "安装与账号", Puzzle],
                    ["recognize", "识别与 AI", ScanLine],
                    ["sync", "同步与隐私", ShieldCheck],
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
                <div className="faq-contact">
                  <strong>更习惯跟着步骤？</strong>
                  <p>完整安装教程可以随时回看。</p>
                  <button className="text-button" onClick={() => guide()}>
                    返回安装教程 <ArrowRight size={14} />
                  </button>
                </div>
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
                            查看安装演示 <ArrowRight size={14} />
                          </button>
                        )}
                        {id === "company" && (
                          <button
                            className="text-button"
                            onClick={() => go("操作演示")}
                          >
                            试试岗位识别 <ArrowRight size={14} />
                          </button>
                        )}
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="no-results">
                    <Search size={26} />
                    <h3>没有找到匹配的问题</h3>
                    <p>试试「登录」「AI」「同步」等关键词。</p>
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
            <section className="privacy-strip">
              <ShieldCheck size={22} />
              <span>页面仅演示操作，不接收你的密码或 API Key。</span>
              <button
                className="text-button"
                onClick={() => setModal({ kind: "account" })}
              >
                了解教学演示 <ArrowRight size={14} />
              </button>
            </section>
          </>
        )}
        <footer className="module-footer">
          <span>下载包含完整扩展源码与 GPL-3.0 许可证。</span>
          <span className="footer-design">Sugar · 让求职有条理</span>
        </footer>
      </div>
      {modal && (
        <Modal
          title={
            modal.kind === "download"
              ? "下载 Sugar 求职助手"
              : modal.kind === "copy"
                ? "复制扩展管理地址"
                : "了解教学演示"
          }
          onClose={() => setModal(null)}
        >
          {modal.kind === "download" ? (
            <div className="modal-body">
              <div className="download-product">
                <span className="extension-logo large">S</span>
                <div>
                  <h3>Sugar 求职助手</h3>
                  <p>v2.0.1 · 电脑端 Chrome / Edge 120+</p>
                </div>
                <span className="badge neutral">ZIP 安装包</span>
              </div>
              <p>
                此扩展适用于电脑端 Chrome /
                Edge。下载后先解压，再到浏览器扩展管理页加载。
              </p>
              <BrowserSwitch browser={browser} setBrowser={setBrowser} />
              <div className="download-checklist">
                <span>
                  <Check size={15} />
                  网站同一账号登录
                </span>
                <span>
                  <Check size={15} />
                  后台识别与投递同步
                </span>
                <span>
                  <Check size={15} />
                  保留智能简历填表
                </span>
              </div>
              <a
                className="button primary full"
                href={DOWNLOAD}
                download="Sugar-Job-Assistant-2.0.1.zip"
                onClick={() => toast("插件 ZIP 已开始下载，下载后请解压")}
              >
                <Download size={16} />
                下载 {browser} 安装包{" "}
                <span className="button-meta">528 KB</span>
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
              <p className="modal-note">
                使用自己的 Sugar 账号与个人 AI 配置。请在插件中完成登录与配置。
              </p>
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
              <div className="modal-illustration">
                <ScanLine size={32} />
              </div>
              <h3>先练习，再去招聘网页操作</h3>
              <p>
                操作演示使用虚构岗位，识别、选择与同步只改变当前页面的练习记录。真实岗位请在插件中登录网站同一账号、授权招聘网站，再确认保存。
              </p>
              <button
                className="button outline full"
                onClick={() => {
                  setModal(null);
                  go("操作演示");
                }}
              >
                体验操作演示 <ArrowRight size={15} />
              </button>
            </div>
          )}
        </Modal>
      )}
      {detail && (
        <Modal title="岗位详情" onClose={() => setDetail(null)}>
          <div className="modal-body job-detail">
            <span className="badge neutral">虚构岗位 · 仅供演示</span>
            <h3>{detail.title}</h3>
            <p>
              {detail.company} · {detail.city} · {detail.code}
            </p>
            <h4>岗位内容</h4>
            <p>{detail.description}</p>
            <button
              className="button outline full"
              onClick={() => {
                if (!records.some((r) => r.id === detail.id))
                  setChecked((x) => new Set([...x, detail.id]));
                setDetail(null);
                go("操作演示");
                setDemoView("page");
              }}
            >
              选择这个已投递岗位 <Check size={15} />
            </button>
          </div>
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
