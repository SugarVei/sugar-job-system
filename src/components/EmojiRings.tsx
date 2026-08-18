// ============================================================
// 登录页左侧：双圈旋转表情环（移植自原设计的 makeRing / faces）
// ============================================================
const D = '#2a2018';

// 8 种糖豆表情的脸部 SVG 片段
const FACES: string[] = [
  `<circle cx="25" cy="30" r="3" fill="${D}"/><circle cx="39" cy="30" r="3" fill="${D}"/><ellipse cx="32" cy="41" rx="3.4" ry="4.4" fill="#E0531A"/>`,
  `<path d="M21 30q4 3.5 8 0" stroke="${D}" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M35 30q4 3.5 8 0" stroke="${D}" stroke-width="2.2" fill="none" stroke-linecap="round"/><ellipse cx="32" cy="42" rx="2.8" ry="3.4" fill="#E0531A"/><text x="43" y="19" font-family="Poppins,sans-serif" font-size="10" font-weight="700" fill="#7C5CFF">z</text><text x="50" y="12" font-family="Poppins,sans-serif" font-size="7" font-weight="700" fill="#7C5CFF">z</text>`,
  `<path d="M25 30a4 4 0 1 0 4 4 2.6 2.6 0 1 0-2.6-2.6 1.3 1.3 0 1 0 1.3 1.3" fill="none" stroke="${D}" stroke-width="1.5"/><path d="M39 30a4 4 0 1 0 4 4 2.6 2.6 0 1 0-2.6-2.6 1.3 1.3 0 1 0 1.3 1.3" fill="none" stroke="${D}" stroke-width="1.5"/><ellipse cx="32" cy="44" rx="3.8" ry="4.4" fill="#E0531A"/>`,
  `<path d="M21 27l6 3-6 3" fill="none" stroke="${D}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M43 27l-6 3 6 3" fill="none" stroke="${D}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M25 40q7 9 14 0Z" fill="#E0531A"/><path d="M19 33q-1.5 5 .5 8" stroke="#7fd0f5" stroke-width="2.6" fill="none" stroke-linecap="round"/><path d="M45 33q1.5 5-.5 8" stroke="#7fd0f5" stroke-width="2.6" fill="none" stroke-linecap="round"/>`,
  `<path d="M21 26l7 2.5" stroke="${D}" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M43 26l-7 2.5" stroke="${D}" stroke-width="2" fill="none" stroke-linecap="round"/><circle cx="25" cy="32" r="2.6" fill="${D}"/><circle cx="39" cy="32" r="2.6" fill="${D}"/><path d="M27 45q5-4 10 0" stroke="${D}" stroke-width="2" fill="none" stroke-linecap="round"/>`,
  `<circle cx="25" cy="29" r="3" fill="${D}"/><circle cx="39" cy="29" r="3" fill="${D}"/><rect x="22" y="37" width="20" height="9" rx="3" fill="#fff" stroke="${D}" stroke-width="1.6"/><path d="M22 41.5h20M27 37v9M32 37v9M37 37v9" stroke="${D}" stroke-width="1.1"/>`,
  `<g fill="#fff"><circle cx="25" cy="27" r="2.3"/><circle cx="25" cy="33" r="2.3"/><circle cx="22" cy="30" r="2.3"/><circle cx="28" cy="30" r="2.3"/></g><circle cx="25" cy="30" r="1.7" fill="${D}"/><g fill="#fff"><circle cx="39" cy="27" r="2.3"/><circle cx="39" cy="33" r="2.3"/><circle cx="36" cy="30" r="2.3"/><circle cx="42" cy="30" r="2.3"/></g><circle cx="39" cy="30" r="1.7" fill="${D}"/><path d="M27 43h10" stroke="${D}" stroke-width="2" stroke-linecap="round"/>`,
  `<path d="M16 31a16 16 0 0 1 32 0" stroke="#8a93a3" stroke-width="3" fill="none"/><rect x="12" y="30" width="7" height="12" rx="3" fill="#8a93a3"/><rect x="45" y="30" width="7" height="12" rx="3" fill="#8a93a3"/><path d="M22 32q3-3.5 6 0" stroke="${D}" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M36 32q3-3.5 6 0" stroke="${D}" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M27 40q2.5 3 5 0q2.5 3 5 0" stroke="${D}" stroke-width="1.8" fill="none" stroke-linecap="round"/><path d="M51 13v9" stroke="#54c4f0" stroke-width="2" stroke-linecap="round"/><circle cx="49" cy="22" r="2.1" fill="#54c4f0"/>`,
];

const BLOB =
  '<path d="M32 5C16 5 7 17 7 33c0 17 12 26 25 26s25-9 25-26C57 17 48 5 32 5Z" fill="#F4B72A"/>';

function makeRing(count: number, radius: number, size: number) {
  return Array.from({ length: count }, (_, i) => {
    const f = FACES[i % FACES.length];
    const a = (i / count) * 360;
    return {
      html: `<svg width="${size}" height="${size}" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">${BLOB}${f}</svg>`,
      pos: `position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) rotate(${a}deg) translate(${radius}px) rotate(${-a}deg);`,
    };
  });
}

const outer = makeRing(16, 300, 56);
const inner = makeRing(10, 150, 60);

export default function EmojiRings() {
  return (
    <div
      style={{
        flex: 1.15,
        position: 'relative',
        background:
          'radial-gradient(120% 120% at 50% 28%, rgba(255,255,255,0.22), rgba(255,255,255,0.04))',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          position: 'absolute',
          width: 300,
          height: 300,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(244,200,74,.18), transparent 70%)',
          filter: 'blur(12px)',
        }}
      />
      {/* 外圈 */}
      <div
        className="emoji-ring"
        style={{
          position: 'absolute',
          width: 600,
          height: 600,
          border: '1px solid rgba(80,66,40,.07)',
          borderRadius: '50%',
          animation: 'spin 82s linear infinite',
        }}
      >
        {outer.map((e, i) => (
          <div key={i} style={cssToObj(e.pos)}>
            <div
              className="emoji-ring__item"
              style={{ animation: 'spinrev 82s linear infinite', width: 56, height: 56, filter: 'drop-shadow(0 7px 11px rgba(60,50,35,.14))' }}
              dangerouslySetInnerHTML={{ __html: e.html }}
            />
          </div>
        ))}
      </div>
      {/* 内圈 */}
      <div
        className="emoji-ring"
        style={{
          position: 'absolute',
          width: 300,
          height: 300,
          border: '1px solid rgba(80,66,40,.09)',
          borderRadius: '50%',
          animation: 'spinrev 56s linear infinite',
        }}
      >
        {inner.map((e, i) => (
          <div key={i} style={cssToObj(e.pos)}>
            <div
              className="emoji-ring__item"
              style={{ animation: 'spin 56s linear infinite', width: 60, height: 60, filter: 'drop-shadow(0 7px 11px rgba(60,50,35,.14))' }}
              dangerouslySetInnerHTML={{ __html: e.html }}
            />
          </div>
        ))}
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: 30,
          left: 42,
          textAlign: 'left',
          fontSize: 13,
          color: '#9a9488',
          fontWeight: 500,
          letterSpacing: '.02em',
        }}
      >
        Sugar · 让求职更有节奏
      </div>
    </div>
  );
}

// 把内联 css 字符串转成 React style 对象
function cssToObj(css: string): React.CSSProperties {
  const obj: Record<string, string> = {};
  css.split(';').forEach((decl) => {
    const [k, v] = decl.split(':');
    if (!k || !v) return;
    const key = k.trim().replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    obj[key] = v.trim();
  });
  return obj as React.CSSProperties;
}
