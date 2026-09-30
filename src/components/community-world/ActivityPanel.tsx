import { ArrowRight, Car, ChevronDown, CirclePlay, LogOut, Plane, Sailboat, Sparkles, X } from 'lucide-react';
import { ACTIVITIES, type ActivityKind, type ActivityStatus } from './WorldActivities';
export default function ActivityPanel({open,onClose,status,go,interact,action,exit,firstPerson,toggleView}:{open:boolean;onClose:()=>void;status:ActivityStatus;go:(id:ActivityKind)=>void;interact:()=>void;action:()=>void;exit:()=>void;firstPerson:boolean;toggleView:()=>void}){
  return <>
    {open&&<aside className="activity-picker" aria-label="玩乐与出行"><header><div><span>TAKE A LITTLE BREAK</span><h2>今天，想去哪里？</h2></div><button aria-label="关闭玩乐出行" onClick={onClose}><X size={18}/></button></header><p>先前往，再按 F 开始。也可以靠近后点击设施或车辆。</p><div className="activity-options">{ACTIVITIES.map(a=>{const Icon=a.id==='taxi'?Car:a.id==='plane'?Plane:a.id==='yacht'?Sailboat:Sparkles;return <button key={a.id} aria-label={`前往${a.name}`} onClick={()=>go(a.id)}><Icon size={22}/><span><strong>{a.name}</strong><small>{a.description}</small></span><ArrowRight size={16}/></button>;})}</div><footer>独立体验版 · 出租车座位尚未联网共享</footer></aside>}
    <div className={`activity-hud ${status.mode?'is-active':''}`} aria-label="互动状态" aria-live="polite">
      <div className="activity-hud-title"><span><i/>{status.mode?status.name:status.nearby?`附近：${status.nearby}`:'自由探索'}</span>{status.mode==='taxi'&&<b>{status.seats} / 4 席</b>}{(status.mode==='plane'||status.mode==='yacht')&&<b>{status.speed} km/h {status.mode==='plane'?' · 38 m':''}</b>}</div>
      <p>{status.message||status.hint}</p>
      {['football','badminton','basketball'].includes(status.mode||'')&&<div className="activity-score"><span>{status.mode==='badminton'?'连续回球':'得分'} <b>{status.score}</b></span><span>{status.mode==='badminton'?'漏球':'出手'} {status.attempts}</span></div>}
      {(status.mode==='basketball'||status.mode==='badminton')&&<div className="activity-meter" aria-label="击球时机"><i style={{left:`${status.meter*100}%`}}/><span/></div>}
      <div className="activity-hud-actions">{!status.mode?<button onClick={interact}><kbd>F</kbd> {status.nearby?'开始体验':'附近互动'}</button>:<><button onClick={toggleView}><CirclePlay size={14}/>{firstPerson?'俯瞰视角':'第一人称'}</button>{status.action&&<button className="activity-action" onClick={action}>{status.action}<kbd>空格</kbd></button>}<button onClick={exit}><LogOut size={14}/>{status.mode==='yacht'?'返航下船':status.mode==='plane'?'返回地面':'退出'}<kbd>F</kbd></button></>}</div>
      {!status.mode&&!status.nearby&&<small><ChevronDown size={11}/> 点击右上角“玩乐出行”选择项目</small>}
    </div>
  </>;
}
