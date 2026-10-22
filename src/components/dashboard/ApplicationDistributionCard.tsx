import { useMemo, useState } from 'react';
import type { Application } from '../../types';
import { useAppShell } from '../../contexts/AppShellContext';
import MotionTabs from '../MotionTabs';
import { countApplicationsBy, normalizeApplicationCity, normalizeApplicationPosition } from '../../lib/applicationsOverview';

type Dimension = 'city' | 'position' | 'channel';
const DIMENSIONS: { value: Dimension; label: string }[] = [
  { value: 'city', label: '城市' },
  { value: 'position', label: '岗位' },
  { value: 'channel', label: '渠道' },
];

function dimensionValue(application: Application, dimension: Dimension) {
  if (dimension === 'city') return normalizeApplicationCity(application.city);
  if (dimension === 'position') return normalizeApplicationPosition(application.position_name);
  return application.channel?.trim();
}

// 原投递总览的城市、岗位、渠道三张图合成一张，用标签切换
export default function ApplicationDistributionCard({ applications }: { applications: Application[] }) {
  const { navigate } = useAppShell();
  const [dimension, setDimension] = useState<Dimension>('city');
  const rows = useMemo(() => countApplicationsBy(applications, (a) => dimensionValue(a, dimension)).slice(0, 8), [applications, dimension]);
  const max = Math.max(1, ...rows.map(([, count]) => count));
  const topCount = Math.min(3, rows.length);
  const topShare = applications.length ? Math.round((rows.slice(0, topCount).reduce((sum, [, count]) => sum + count, 0) / applications.length) * 100) : 0;
  const label = DIMENSIONS.find((d) => d.value === dimension)!.label;

  return (
    <section className="do-card do-dist-card" aria-label="投递分布">
      <header className="do-card-head">
        <div><h3>投递分布</h3><p>看清你主要投向了哪里、什么岗位、从哪个渠道</p></div>
      </header>
      <MotionTabs value={dimension} onChange={setDimension} options={DIMENSIONS} label="投递分布维度" className="do-tabs" />
      {rows.length === 0 ? (
        <p className="do-dist-empty">暂无{label}信息</p>
      ) : (
        <>
          <div className="do-dist-rows">
            {rows.map(([name, count]) => (
              <button
                key={name}
                type="button"
                className="do-dist-row"
                title={`查看「${name}」的投递`}
                // 城市统计用的是「上海市」这类全称，搜索时去掉「市」才能匹配「上海」
                onClick={() => navigate('applications', { query: dimension === 'city' ? name.replace(/市$/, '') : name })}
              >
                <span>{name}</span>
                <span className="do-dist-track"><i style={{ width: `${Math.round((count / max) * 100)}%` }} /></span>
                <b>{count}</b>
              </button>
            ))}
          </div>
          <p className="do-dist-foot">前 {topCount} 个{label}占全部投递的 <b>{topShare}%</b> · 点击条目可筛选投递记录</p>
        </>
      )}
    </section>
  );
}
