import { useEffect, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Copy, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { FURNITURE, FURNITURE_TINTS, MAX_FURNITURE, type Furniture, type FurnitureKind } from './data';
import { clampFurniture, findSpace, placementError } from './roomLayout';
import { furnitureThumbnails } from './room-design/thumbnails.js';

export default function FurnitureShop({items,onChange,notify}:{items:Furniture[];onChange:(items:Furniture[])=>void;notify:(message:string)=>void}) {
  const [category,setCategory]=useState('全部'),[selected,setSelected]=useState<string|null>(null),[images,setImages]=useState<Record<string,string>>({});
  useEffect(()=>{let alive=true;void furnitureThumbnails().then((result:Record<string,string>)=>{if(alive)setImages(result);}).catch(()=>{});return()=>{alive=false;};},[]);
  const item=items.find(f=>f.id===selected),spec=FURNITURE.find(f=>f.kind===item?.kind);
  const add=(kind:FurnitureKind,copy?:Furniture)=>{
    if(items.length>=MAX_FURNITURE){notify(`最多可以摆放 ${MAX_FURNITURE} 件家具。`);return;}
    const next=findSpace({...copy,id:crypto.randomUUID(),kind,x:0,z:0,rotation:copy?.rotation||0},items);
    if(!next){notify('没有足够的空位，移开一些家具再试。');return;}
    onChange([...items,next]);setSelected(next.id);notify(`已添加${FURNITURE.find(f=>f.kind===kind)?.label}。`);
  };
  const change=(patch:Partial<Furniture>)=>{
    if(!item)return;const next=clampFurniture({...item,...patch});const error=placementError(next,items);
    if(error){notify(error);return;}onChange(items.map(f=>f.id===item.id?next:f));
  };
  return <section className="room-furniture-shop" aria-label="家具布置">
    <div className="furniture-heading"><strong>添点喜欢的东西</strong><span>{items.length}/{MAX_FURNITURE}</span></div>
    <div className="furniture-categories">{['全部','座椅','桌台','床','收纳','装饰','已放置'].map(label=><button key={label} aria-pressed={category===label} onClick={()=>setCategory(label)}>{label}</button>)}</div>
    {category!=='已放置'&&<div className="furniture-shop furniture-models">{FURNITURE.filter(f=>category==='全部'||f.category===category).map(f=><button key={f.kind} aria-label={`添加${f.label}`} disabled={items.length>=MAX_FURNITURE} onClick={()=>add(f.kind)}>{images[f.kind]?<img src={images[f.kind]} alt=""/>:<span className="furniture-placeholder">◇</span>}<span>{f.label}</span><Plus size={12}/></button>)}</div>}
    <p className="furniture-help">在画面中拖动家具，或选中下方的家具，用方向按钮微调。</p>
    {item&&<div className="furniture-selection" aria-label="选中家具工具"><strong>{spec?.label}</strong><div className="furniture-tools">{[[0,-.25,ArrowUp,'向后移动'],[-.25,0,ArrowLeft,'向左移动'],[.25,0,ArrowRight,'向右移动'],[0,.25,ArrowDown,'向前移动']].map(([x,z,Icon,label])=>{const I=Icon as typeof ArrowUp;return <button key={String(label)} aria-label={String(label)} onClick={()=>change({x:item.x+Number(x),z:item.z+Number(z)})}><I size={15}/></button>;})}<button aria-label="旋转选中家具" onClick={()=>change({rotation:(item.rotation+Math.PI/2)%(Math.PI*2)})}><RotateCcw size={15}/></button><button aria-label="复制选中家具" onClick={()=>add(item.kind,item)}><Copy size={15}/></button><button aria-label="删除选中家具" onClick={()=>{onChange(items.filter(f=>f.id!==item.id));setSelected(null);}}><Trash2 size={15}/></button></div>{spec?.tintable&&<div className="furniture-tints" aria-label="家具颜色">{FURNITURE_TINTS.map(t=><button key={t.id} aria-label={`家具颜色${t.label}`} aria-pressed={(item.tint||'default')===t.id} style={{background:t.color}} onClick={()=>change({tint:t.id})}/>)}</div>}</div>}
    <div className="furniture-list">{items.map(f=><button className={`furniture-item ${selected===f.id?'selected':''}`} key={f.id} onClick={()=>setSelected(f.id)} aria-pressed={selected===f.id}>{images[f.kind]&&<img src={images[f.kind]} alt=""/>}<span>{FURNITURE.find(s=>s.kind===f.kind)?.label}</span><small>选择</small></button>)}</div>
    <button className="world-secondary" disabled={!items.length} onClick={()=>{onChange([]);setSelected(null);}}>清空家具</button>
  </section>;
}
