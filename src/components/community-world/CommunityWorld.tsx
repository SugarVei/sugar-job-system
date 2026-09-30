import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, ChevronRight, Compass, Expand, Flower2, Hand, Heart, HelpCircle, Home, LampFloor, Map, Maximize2, Minus, Moon, Move, Palette, Plus, RotateCcw, Search, Sofa, Sun, Trash2, Users, X, BookOpen, Frame, Square, Save, LocateFixed, ArrowUpRight, Cuboid, Camera, MessageSquare, Sparkles } from 'lucide-react';
import { COLORS, FLOORS, FURNITURE, DISTRICTS, LANDMARKS, createRooms, loadWorld, saveWorld, type FurnitureKind, type Room } from './data';
import { WorldScene } from './WorldScene';
import './CommunityWorld.css';
import { useWorldSync } from './useWorldSync';
import WorldBoard from './WorldBoard';
import ActivityPanel from './ActivityPanel';
import { EMPTY_ACTIVITY, type ActivityKind } from './WorldActivities';

declare global { interface Window { __sugarWorld?: { diagnostics: () => ReturnType<WorldScene['diagnostics']> } } }
const itemIcons = { plant: Flower2, sofa: Sofa, shelf: BookOpen, lamp: LampFloor, rug: Square, art: Frame };
type Panel = 'room' | 'directory' | 'edit' | null;

export default function CommunityWorld() {
  const initial=useMemo(()=>loadWorld(),[]),seeds=useMemo(()=>createRooms(),[]);
  const emptyRooms=useMemo(()=>seeds.map(r=>({...r,occupied:false,mine:false,owner:'',name:'留一间给未来的你',tags:[],bio:'',furniture:[]})),[seeds]);
  const [localRoom,setSaved]=useState<Room|null>(initial.room),[draft,setDraft]=useState<Room|null>(null);
  const [likes,setLikes]=useState(initial.likes),[selected,setSelected]=useState<string|null>(null);
  const [panel,setPanel]=useState<Panel>(null),[search,setSearch]=useState(''),[filter,setFilter]=useState('全部');
  const [mapOpen,setMapOpen]=useState(false),[help,setHelp]=useState(false),[expanded,setExpanded]=useState(false),[night,setNight]=useState(false);
  const [activity,setActivity]=useState(EMPTY_ACTIVITY),[activitiesOpen,setActivitiesOpen]=useState(false),[cameraMode,setCameraMode]=useState<'pan'|'rotate'>('pan');
  const [firstPerson,setFirstPerson]=useState(false),[boardOpen,setBoardOpen]=useState(false),[district,setDistrict]=useState('A');
  const [ready,setReady]=useState(false),[error,setError]=useState(''),[toast,setToast]=useState(initial.warning||'');
  const [welcome,setWelcome]=useState(!initial.room),[tagsText,setTagsText]=useState('');
  const host=useRef<HTMLDivElement>(null),scene=useRef<WorldScene|null>(null);
  const sync=useWorldSync(scene),cloud=!!sync.user;
  const saved=cloud?sync.sharedRooms.find(r=>r.mine)||null:localRoom;
  const [saving,setSaving]=useState(false);
  const callbacks=useRef<{select:(id:string)=>void;move:(id:string,x:number,z:number)=>void;board:()=>void}>({select:()=>{},move:()=>{},board:()=>{}});
  const rooms=useMemo(()=>(cloud?emptyRooms:seeds).map(r=>draft?.id===r.id?draft:cloud?(sync.sharedRooms.find(s=>s.id===r.id)||r):saved?.id===r.id?saved:r),[seeds,emptyRooms,saved,draft,cloud,sync.sharedRooms]);
  const room=rooms.find(r=>r.id===selected);
  const notify=(message:string)=>setToast(message);
  const viewRoom=useCallback((id:string)=>{
    if(draft){setToast('正在装饰房间，请先保存或取消修改。');return;}
    setBoardOpen(false);setActivitiesOpen(false);setSelected(id);setPanel('room');scene.current?.select(id);scene.current?.focus(id);setWelcome(false);
  },[draft]);
  useEffect(()=>{callbacks.current={select:viewRoom,board:()=>{if(draft){setToast('请先保存或取消房间修改。');return;}setBoardOpen(true);setActivitiesOpen(false);setPanel(null);setWelcome(false);},move:(id,x,z)=>setDraft(current=>current?{...current,furniture:current.furniture.map(f=>f.id===id?{...f,x,z}:f)}:current)};},[viewRoom,draft]);
  useEffect(()=>{
    if(!host.current)return;
    let instance:WorldScene|null=null;
    try {instance=new WorldScene(host.current,{select:id=>callbacks.current.select(id),move:(id,x,z)=>callbacks.current.move(id,x,z),board:()=>callbacks.current.board(),view:setFirstPerson,activity:status=>setActivity(old=>JSON.stringify(old)===JSON.stringify(status)?old:status),ready:()=>setReady(true),error:setError});scene.current=instance;window.__sugarWorld={diagnostics:()=>instance!.diagnostics()};}
    catch {setError('当前浏览器无法启动三维画面。请使用支持 WebGL 的 Chrome 或 Edge，并开启图形加速。');}
    return()=>{instance?.dispose();scene.current=null;delete window.__sugarWorld;};
  },[]);
  useEffect(()=>{scene.current?.setRooms(rooms);},[rooms]);
  useEffect(()=>{scene.current?.edit(draft?.id||null);},[draft?.id]);
  useEffect(()=>{if(!toast)return;const timer=window.setTimeout(()=>setToast(''),4200);return()=>clearTimeout(timer);},[toast]);
  useEffect(()=>{
    const close=(e:KeyboardEvent)=>{if(e.key==='Escape'){if(help)setHelp(false);else if(activitiesOpen)setActivitiesOpen(false);else if(mapOpen)setMapOpen(false);else if(boardOpen)setBoardOpen(false);else if(!draft)setPanel(null);}};
    window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close);
  },[help,mapOpen,draft,boardOpen,activitiesOpen]);
  useEffect(()=>{
    if(!help)return;
    const trap=(e:KeyboardEvent)=>{
      if(e.key!=='Tab')return;
      const buttons=document.querySelectorAll<HTMLButtonElement>('.world-help-modal button');const first=buttons[0],last=buttons[buttons.length-1];
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
    };
    window.addEventListener('keydown',trap);return()=>window.removeEventListener('keydown',trap);
  },[help]);
  const goActivity=(id:ActivityKind)=>{if(draft){notify('请先保存或取消房间修改。');return;}setPanel(null);setBoardOpen(false);setWelcome(false);setActivitiesOpen(false);scene.current?.goToActivity(id);};
  const startEdit=(r:Room)=>{
    setDraft({...r,tags:[...r.tags],furniture:r.furniture.map(f=>({...f}))});setTagsText(r.tags.join('，'));setPanel('edit');setSelected(r.id);setWelcome(false);scene.current?.focus(r.id);
  };
  const claim=(r:Room)=>{
    if(saved){viewRoom(saved.id);notify('你已经有一间房间了，快来布置它吧。');return;}
    if(cloud&&!sync.connected){notify('正在连接社区，请稍后领取。');return;}
    startEdit({...r,name:'我的小天地',owner:'你',bio:'你好，欢迎来到我的房间。一起努力，也一起生活。',tags:['寻找搭子'],occupied:true,mine:true,furniture:[{id:'welcome-plant',kind:'plant',x:2.4,z:-1.8,rotation:0},{id:'welcome-rug',kind:'rug',x:.2,z:.65,rotation:0}]});
  };
  const myRoom=()=>{
    if(draft){setPanel('edit');scene.current?.focus(draft.id);return;}
    if(saved){viewRoom(saved.id);return;}
    const free=rooms.find(r=>r.id==='C01'&&!r.occupied)||rooms.find(r=>!r.occupied);if(free)viewRoom(free.id);
  };
  const save=async()=>{
    if(!draft||saving)return;
    if(!draft.name.trim()){notify('给房间起一个名字吧。');return;}
    const value={...draft,name:draft.name.trim(),tags:[...new Set(tagsText.split(/[,，、\n]/).map(t=>t.trim()).filter(Boolean))].slice(0,4).map(t=>t.slice(0,12))};
    if(cloud){setSaving(true);try{await sync.saveRoom(value);setDraft(null);setPanel('room');notify('房间已同步，所有邻居都能看到你的布置。');}catch(error){notify(error instanceof Error?error.message:'保存失败，请重试。');}finally{setSaving(false);}return;}
    if(!saveWorld(value,likes)){notify('浏览器未能保存，请允许本地存储后重试。你的修改仍在编辑器中。');return;}
    setSaved(value);setDraft(null);setPanel('room');notify('房间已保存。下次用这个浏览器回来，它还在这里。');
  };
  const cancel=()=>{setDraft(null);setPanel('room');notify('已取消本次修改。');};
  const addFurniture=(kind:FurnitureKind)=>{
    if(!draft)return;if(draft.furniture.length>=12){notify('这间房间最多可以摆放 12 件装饰。');return;}
    const n=draft.furniture.length;
    setDraft({...draft,furniture:[...draft.furniture,{id:crypto.randomUUID(),kind,x:Math.min(2.4,-1.8+(n%4)*1.25),z:1.7-Math.floor(n/4)*.65,rotation:0}]});
  };
  const toggleLike=(id:string)=>{
    const next=likes.includes(id)?likes.filter(x=>x!==id):[...likes,id];
    if(!saveWorld(localRoom,next)){notify('收藏未能保存，请检查浏览器存储设置。');return;}
    setLikes(next);notify(next.includes(id)?'已收藏这个房间。':'已取消收藏。');
  };
  const filtered=rooms.filter(r=>(filter==='空房间'?!r.occupied:filter==='已收藏'?likes.includes(r.id):true)&&(!search||`${r.name} ${r.owner} ${r.id} ${r.tags.join(' ')}`.toLowerCase().includes(search.toLowerCase())));
  const togglePanel=()=>{if(draft){notify('请先保存或取消房间修改。');return;}setBoardOpen(false);setPanel(panel==='directory'?null:'directory');setWelcome(false);};
  const direction=(x:number,z:number,label:string,Icon:typeof ArrowUp)=><button type="button" aria-label={label} onPointerDown={e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);scene.current?.setTouch(x,z);}} onPointerUp={()=>scene.current?.setTouch(0,0)} onPointerCancel={()=>scene.current?.setTouch(0,0)} onLostPointerCapture={()=>scene.current?.setTouch(0,0)}><Icon size={15}/></button>;
  return <section className={`community-world ${expanded?'is-expanded':''} ${night?'is-night':''} ${panel||boardOpen?'has-panel':''} ${firstPerson?'is-first-person':''}`} aria-label="求职小镇" data-ready={ready}>
    <div ref={host} className="world-canvas"/>
    {!ready&&!error&&<div className="world-loading"><Cuboid size={38}/><strong>正在打开你的街区</strong><span>给每一份努力，留一个小小的位置。</span></div>}
    {error&&<div className="world-loading" role="alert"><strong>暂时无法显示地图</strong><p>{error}</p><button className="world-primary" onClick={()=>location.reload()}>重新打开</button></div>}
    <div className="world-topbar">
      <div className="world-identity"><div className="world-wordmark"><Cuboid size={25}/><strong>sugar<span>.world</span></strong></div><span className="district-chip"><i/>{cloud?`${sync.online} 人在线`:'初见岛'}</span></div>
      <div className="world-camera-controls"><button className="camera-mode" aria-label={cameraMode==='pan'?'切换为拖动旋转':'切换为拖动平移'} title="切换鼠标拖动方式" onClick={()=>{const mode=cameraMode==='pan'?'rotate':'pan';setCameraMode(mode);scene.current?.setCameraMode(mode);}}>{cameraMode==='pan'?<Move size={17}/>:<RotateCcw size={17}/>}<span>{cameraMode==='pan'?'平移':'旋转'}</span></button><button title="旋转视角" aria-label="旋转视角" onClick={()=>scene.current?.rotate()}><RotateCcw size={17}/></button><div className="world-zoom"><button aria-label="缩小地图" onClick={()=>scene.current?.zoom(-1)}><Minus size={17}/></button><button aria-label="放大地图" onClick={()=>scene.current?.zoom(1)}><Plus size={17}/></button></div><button title={night?'切换白天':'切换傍晚'} aria-label={night?'切换白天':'切换傍晚'} onClick={()=>{setNight(!night);scene.current?.setNight(!night);}}>{night?<Sun size={17}/>:<Moon size={17}/>}</button><button title={expanded?'退出沉浸模式':'沉浸模式'} aria-label={expanded?'退出沉浸模式':'沉浸模式'} onClick={()=>setExpanded(!expanded)}><Expand size={17}/></button></div>
    </div>
    <div className="world-street-label"><span>ISLAND 01 · 100 ROOMS</span><b>每一个小房间，都有一个大梦想。</b></div>
    <div className="world-main-actions"><button className="world-pill" onClick={()=>{if(draft){notify('请先保存或取消房间修改。');return;}setPanel(null);setBoardOpen(false);setActivitiesOpen(!activitiesOpen);setWelcome(false);}}><Sparkles size={16}/>玩乐出行</button><button className="world-pill" onClick={()=>callbacks.current.board()}><MessageSquare size={16}/>世界公告栏</button><button className="world-pill camera-toggle" onClick={()=>{if(draft){notify('请先保存或取消房间修改。');return;}scene.current?.setFirstPerson(!firstPerson);}}><Camera size={16}/>{firstPerson?'俯瞰视角':'第一人称'}</button><button className="world-pill" onClick={togglePanel}><Users size={17}/>发现邻居</button><button className="world-pill dark" onClick={myRoom}><Home size={17}/>{saved?'我的房间':'领取房间'}<ArrowUpRight size={15}/></button></div>
    {welcome&&!panel&&!boardOpen&&!activitiesOpen&&!firstPerson&&!activity.mode&&<div className="world-welcome"><button className="world-close" aria-label="关闭欢迎提示" onClick={()=>setWelcome(false)}><X size={15}/></button><span className="welcome-illustration"><Flower2 size={26}/></span><div><strong>你好，新邻居。</strong><p>逛逛大家的小天地，<br/>也给自己留一间。</p><button onClick={myRoom}>找到我的房间 <ArrowRight size={15}/></button></div></div>}
    <div className="world-movement"><div className="world-direction-pad"><span className="north">N</span><div className="pad-up">{direction(0,-1,'向前移动',ArrowUp)}</div><div className="pad-left">{direction(-1,0,'向左移动',ArrowLeft)}</div><button className="pad-center" aria-label="定位我的人物" onClick={()=>scene.current?.followPlayer()}><LocateFixed size={19}/></button><div className="pad-right">{direction(1,0,'向右移动',ArrowRight)}</div><div className="pad-down">{direction(0,1,'向后移动',ArrowDown)}</div></div><button className="world-help-link" onClick={()=>setHelp(true)}><HelpCircle size={14}/>操作指南</button></div>
    <div className="world-bottom-hint"><Move size={14}/><span>{draft?'拖动家具摆放 · 在右侧保存房间':firstPerson?'按住拖动环顾 · 方向键行走 · 点击空地前往':cameraMode==='pan'?'拖动自由平移 · 右键旋转 · 鼠标指向哪里就缩放哪里':'拖动旋转当前视野 · 切换平移可探索其他位置'}</span></div>
    <nav className="world-bottom-actions" aria-label="地图快捷操作"><button className={mapOpen?'active':''} onClick={()=>setMapOpen(!mapOpen)}><Map size={19}/><span>街区</span></button><button onClick={()=>scene.current?.wave()}><Hand size={19}/><span>招手</span></button><button onClick={()=>scene.current?.jump()}><ArrowUp size={19}/><span>跳跃</span></button><button onClick={()=>scene.current?.home()}><Compass size={19}/><span>归位</span></button></nav>
    <div className="world-local-note">{cloud?sync.status:'访客体验 · 登录正式网站后加入多人小镇'}</div>
    {mapOpen&&<section className="world-minimap" aria-label="街区地图"><header><div><strong>初见岛</strong><span>100 个房间 · 每区 5 × 5 · 可持续扩建</span></div><button className="world-close" aria-label="关闭街区地图" onClick={()=>setMapOpen(false)}><X size={16}/></button></header><div className="district-tabs">{DISTRICTS.map(d=><button key={d.id} className={district===d.id?'active':''} onClick={()=>setDistrict(d.id)}>{d.name}</button>)}</div><div className="minimap-grid">{rooms.filter(r=>r.id.startsWith(district+'-')).map(r=><button key={r.id} title={`${r.id} ${r.name}`} aria-label={`地图房间 ${r.id} ${r.occupied?r.name:'空房间'}`} className={`${r.occupied?'occupied':''} ${r.mine?'mine':''} ${selected===r.id?'selected':''}`} style={{'--room-color':r.color} as React.CSSProperties} onClick={()=>{viewRoom(r.id);setMapOpen(false);}}>{r.mine?<Home size={12}/>:r.id}</button>)}</div><div className="minimap-legend"><span><i/>空房间</span><span><i/>有邻居</span><button onClick={()=>{scene.current?.overview();setMapOpen(false);}}>俯瞰整个街区 <Maximize2 size={12}/></button></div></section>}
    <nav className="island-destinations" aria-label="岛屿地点">{LANDMARKS.map(l=><button key={l.id} onClick={()=>{if(draft){notify('请先保存或取消房间修改。');return;}scene.current?.visit(l.id);setWelcome(false);setPanel(null);setBoardOpen(false);}}>{l.name}</button>)}</nav>
    {firstPerson&&<div className="world-crosshair" aria-hidden="true">+</div>}
    {!panel&&!boardOpen&&<ActivityPanel open={activitiesOpen} onClose={()=>setActivitiesOpen(false)} status={activity} go={goActivity} interact={()=>scene.current?.interact()} action={()=>scene.current?.activityAction()} exit={()=>scene.current?.exitActivity()} firstPerson={firstPerson} toggleView={()=>scene.current?.setFirstPerson(!firstPerson)}/>}
    {boardOpen&&<WorldBoard user={sync.user} onClose={()=>setBoardOpen(false)}/>}
    {panel&&<aside className="world-panel" aria-label={panel==='edit'?'装饰我的房间':panel==='directory'?'发现邻居':'房间详情'}>
      <header className="world-panel-header"><div><span>{panel==='edit'?'MAKE IT YOURS':panel==='directory'?'MEET YOUR NEIGHBORS':`ROOM ${room?.id||''}`}</span><h2>{panel==='edit'?'装饰我的房间':panel==='directory'?'发现邻居':room?.occupied?'来串个门':'你的故事，从这里开始'}</h2></div><button className="world-close" aria-label="关闭房间面板" onClick={()=>{if(draft)cancel();else{setPanel(null);scene.current?.select(null);}}}><X size={19}/></button></header>
      {panel==='directory'&&<><div className="world-search"><Search size={17}/><input aria-label="搜索邻居或标签" placeholder="搜索房间、专业、城市…" value={search} onChange={e=>setSearch(e.target.value)}/>{search&&<button aria-label="清空搜索" onClick={()=>setSearch('')}><X size={14}/></button>}</div><div className="world-tabs">{['全部','空房间','已收藏'].map(t=><button key={t} className={filter===t?'active':''} onClick={()=>setFilter(t)}>{t}</button>)}</div><div className="world-directory"><p className="world-result-count">{filtered.length} 个房间{filter==='全部'?' · 在这里遇见同路人':''}</p>{filtered.map(r=><button className="world-room-row" key={r.id} onClick={()=>viewRoom(r.id)}><span className="room-row-avatar" style={{background:r.color}}>{r.occupied?r.name[0]:<Plus size={19}/>}</span><span><strong>{r.name}</strong><small>{r.occupied?r.tags.slice(0,2).join(' · '):'等待一位新邻居'}</small></span><span className="room-row-id">{r.id}<ChevronRight size={14}/></span></button>)}{!filtered.length&&<div className="world-empty"><Search size={30}/><strong>{filter==='已收藏'?'还没有收藏的房间':'暂时没有匹配的邻居'}</strong><p>{filter==='已收藏'?'拜访房间时，点击爱心就能收藏。':'试试其他专业、城市或房间名称。'}</p></div>}</div></>}
      {panel==='room'&&room&&<div className="world-detail"><div className="room-card-art" style={{'--room-color':room.color} as React.CSSProperties}><Cuboid size={72} strokeWidth={.8}/><span>{room.id}</span></div><span className="room-owner">{room.mine?'这是你的小天地':room.occupied?`${room.owner} 的房间${cloud?'':' · 示例邻居'}`:'空房间 · 等待入住'}</span><h3>{room.name}</h3><div className="room-tags">{room.tags.map(t=><span key={t}>{t}</span>)}</div><p className="room-bio">{room.occupied?room.bio:'一张书桌，一盏灯，再放一点你喜欢的东西。让这个小小的格子，成为属于你的空间。'}</p><div className="room-spec"><span>房间位置<b>初见岛 / {room.id}</b></span><span>空间装饰<b>{room.furniture.length} 件</b></span></div>{room.mine?<button className="world-primary" onClick={()=>startEdit(room)}><Palette size={17}/>装饰我的房间</button>:room.occupied?<button className={`world-secondary ${likes.includes(room.id)?'liked':''}`} onClick={()=>toggleLike(room.id)}><Heart size={17} fill={likes.includes(room.id)?'currentColor':'none'}/>{likes.includes(room.id)?'已收藏这个房间':'收藏这个房间'}</button>:<button className="world-primary" onClick={()=>claim(room)}><Plus size={17}/>{saved?'前往我的房间':'就选这一间'}</button>}<p className="room-footnote">{room.mine?(cloud?'已保存至账号，布置会同步给其他邻居。':'已保存到当前浏览器，可随时回来修改。'):room.occupied?(cloud?'这是一位真实邻居的房间。':'示例房间用于体验浏览和收藏。'):'第一期每位访客可领取一间房间。'}</p></div>}
      {panel==='edit'&&draft&&<><div className="world-editor"><div className="editor-intro"><Palette size={17}/><span>一间小房间，一点你的风格。</span></div>{cloud&&localRoom&&<button className="world-secondary" onClick={()=>{setDraft({...draft,name:localRoom.name,bio:localRoom.bio,color:localRoom.color,floor:localRoom.floor,furniture:localRoom.furniture.map(f=>({...f}))});setTagsText(localRoom.tags.join("，"));notify("已导入布置，点击保存后才会发布到社区。");}}>导入本机房间布置</button>}<label className="editor-field">房间名称 <span>{draft.name.length}/18</span><input maxLength={18} value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})}/></label><label className="editor-field">个人标签 <input value={tagsText} maxLength={70} placeholder="机械工程，杭州，寻找搭子" onChange={e=>setTagsText(e.target.value)}/><small>用逗号分隔，最多 4 个，每个不超过 12 字。</small></label><label className="editor-field">想对邻居说<textarea maxLength={180} rows={3} value={draft.bio} onChange={e=>setDraft({...draft,bio:e.target.value})}/></label><fieldset className="editor-colors"><legend>房间主题色</legend>{COLORS.map((c,i)=><button aria-label={`主题色 ${i+1}`} aria-pressed={draft.color===c} key={c} style={{background:c}} onClick={()=>setDraft({...draft,color:c})}>{draft.color===c&&<Check size={16}/>}</button>)}</fieldset><fieldset className="editor-floors"><legend>地板</legend>{FLOORS.map((c,i)=><button aria-pressed={draft.floor===c} key={c} onClick={()=>setDraft({...draft,floor:c})}><i style={{background:c}}/>{['奶油白','鼠尾草','暖砂色'][i]}{draft.floor===c&&<Check size={12}/>}</button>)}</fieldset><div className="furniture-heading"><strong>添点喜欢的东西</strong><span>{draft.furniture.length}/12</span></div><div className="furniture-shop">{FURNITURE.map(f=>{const Icon=itemIcons[f.kind];return <button key={f.kind} disabled={draft.furniture.length>=12} onClick={()=>addFurniture(f.kind)}><Icon size={23}/><span>{f.label}</span><Plus size={12}/></button>;})}</div><p className="furniture-help"><Move size={13}/>在地图中拖动家具，可以改变摆放位置。</p><div className="furniture-list">{draft.furniture.map(f=>{const Icon=itemIcons[f.kind];return <div key={f.id}><Icon size={16}/><span>{FURNITURE.find(i=>i.kind===f.kind)?.label}</span><button title="旋转家具" aria-label={`旋转${FURNITURE.find(i=>i.kind===f.kind)?.label}`} onClick={()=>setDraft({...draft,furniture:draft.furniture.map(x=>x.id===f.id?{...x,rotation:(x.rotation+Math.PI/2)%(Math.PI*2)}:x)})}><RotateCcw size={14}/></button><button title="移除家具" aria-label={`移除${FURNITURE.find(i=>i.kind===f.kind)?.label}`} onClick={()=>setDraft({...draft,furniture:draft.furniture.filter(x=>x.id!==f.id)})}><Trash2 size={14}/></button></div>;})}</div></div><footer className="editor-footer"><button className="world-secondary" onClick={cancel}>取消</button><button className="world-primary" onClick={save} disabled={saving}><Save size={16}/>保存房间</button></footer></>}
    </aside>}
    {help&&<div className="world-modal-backdrop" onClick={()=>setHelp(false)}><section className="world-help-modal" role="dialog" aria-modal="true" aria-labelledby="world-help-title" onClick={e=>e.stopPropagation()}><button className="world-close" autoFocus aria-label="关闭操作指南" onClick={()=>setHelp(false)}><X size={20}/></button><Compass size={32}/><h2 id="world-help-title">慢慢逛，不用赶路。</h2><p>这里是 Sugar 的求职小镇。</p><dl><dt>浏览地图</dt><dd>默认拖动平移，右键旋转当前视野；滚轮朝鼠标位置缩放。顶部可切换拖动旋转，手机双指可缩放旋转。点击“第一人称”可进入人物视角。</dd><dt>移动人物</dt><dd>点击空地自动行走；用 WASD / 方向键行走，空格跳跃。手机使用左下角方向盘。</dd><dt>玩乐与出行</dt><dd>打开“玩乐出行”前往设施，靠近后按 F 进入/退出。空格使用项目动作；驾驶时 W/S 调速，A/D 转向。船只能在海上航行，飞机固定高度和范围。</dd><dt>拜访与入住</dt><dd>点击房间或打开“发现邻居”。找到空房间后，点击“就选这一间”。</dd><dt>装饰房间</dt><dd>修改名字、标签与配色，添加家具并在地图中拖动。完成后点击保存。</dd></dl><p className="help-preview-note">{cloud?'已连接账号社区。房间、帖子、评论和设施座位全岛共享；收藏保存在本机。断线后会自动重连。':'当前为访客体验。登录正式网站后可加入多人社区；访客的房间和帖子仅保存在当前浏览器。'}</p><button className="world-primary" onClick={()=>setHelp(false)}>知道了，去逛逛 <ArrowRight size={16}/></button></section></div>}
    {toast&&<div className="world-toast" role="status"><Check size={16}/>{toast}</div>}
  </section>;
}
