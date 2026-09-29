import { useEffect, useRef } from 'react';
import './WelcomeNoticeModal.css';

export default function WelcomeNoticeModal({ onClose }: { onClose: () => void }) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="welcome-notice-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="welcome-notice" role="dialog" aria-modal="true" aria-labelledby="welcome-notice-title" aria-describedby="welcome-notice-intro">
        <header className="welcome-notice-header">
          <div>
            <span className="welcome-notice-eyebrow">使用提示</span>
            <h2 id="welcome-notice-title">让页面动画更流畅</h2>
          </div>
          <button ref={closeButtonRef} type="button" className="welcome-notice-close" onClick={onClose} aria-label="关闭使用提示">×</button>
        </header>

        <div className="welcome-notice-body">
          <p id="welcome-notice-intro" className="welcome-notice-intro">如果电脑端 Chrome 的动画有些卡顿，可以先检查下面的浏览器设置。截图可点击查看原图。</p>

          <div className="welcome-notice-step">
            <div className="welcome-notice-step-heading"><span className="welcome-notice-step-number">1</span><h3>检查图形加速</h3><span className="welcome-notice-badge">建议先看</span></div>
            <p>打开 Chrome「设置 → 系统」，开启「使用图形加速功能（如果可用）」，然后按提示重启浏览器。若已经开启，无需重复操作；效果也会因设备而异。</p>
            <a className="welcome-notice-image-link" href="/images/chrome-graphics-acceleration.png" target="_blank" rel="noopener noreferrer" aria-label="查看 Chrome 图形加速设置原图">
              <img src="/images/chrome-graphics-acceleration.png" alt="Chrome 系统设置中已开启使用图形加速功能" />
              <span>点击查看原图 ↗</span>
            </a>
          </div>

          <div className="welcome-notice-step">
            <div className="welcome-notice-step-heading"><span className="welcome-notice-step-number">2</span><h3>了解性能设置</h3></div>
            <p>打开 Chrome「设置 → 性能」可以看到下图的选项。<strong>「替换 CPU 性能层级」只改变网页读到的等级，不会提高 CPU 的实际速度</strong>，一般保持默认即可。预加载网页主要影响打开速度，不能直接解决动画卡顿。</p>
            <a className="welcome-notice-image-link" href="/images/chrome-performance-settings.jpg" target="_blank" rel="noopener noreferrer" aria-label="查看 Chrome 性能设置原图">
              <img src="/images/chrome-performance-settings.jpg" alt="Chrome 性能设置中的内存、预加载网页与替换 CPU 性能层级选项" />
              <span>点击查看原图 ↗</span>
            </a>
          </div>

          <div className="welcome-notice-ai">
            <h3>AI 功能配置提醒</h3>
            <p>使用这个网页的所有 AI 功能都需要自己接入 API。如果不会配置，可以联系 Sugar 的微信：<strong>18190199757</strong>，Sugar 来教你。</p>
            <p className="welcome-notice-nonprofit">作者不收取任何费用，本网站不会用于任何盈利行为，只希望大家到作者 GitHub 项目点一个 Star 就行！</p>
          </div>
        </div>

        <footer className="welcome-notice-footer">
          <a href="https://github.com/SugarVei/sugar-job-system" target="_blank" rel="noopener noreferrer" className="welcome-notice-star">去 GitHub 点 Star ↗</a>
          <button type="button" className="welcome-notice-done" onClick={onClose}>知道了</button>
        </footer>
      </section>
    </div>
  );
}
