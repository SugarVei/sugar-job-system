import { decodeFurniture } from './roomLayout';
import { useEffect, useRef, useState, type RefObject } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { COLORS, FLOORS, ROOM_STYLES, createRooms, type Room } from './data';
import type { WorldScene } from './WorldScene';
import { validPlayerFrame, type PlayerFrame, type SharedSeat } from './networkTypes';

export function publicName(user: User) { return String(user.user_metadata?.name || user.user_metadata?.full_name || '岛上邻居').slice(0,24); }
type RoomRow={id:string;user_id:string;data:Record<string,unknown>};
export function decodeRoom(row:RoomRow,userId:string):Room|null {
  const base=createRooms().find(r=>r.id===row.id);if(!base)return null;
  const d=row.data;
  const text=(v:unknown,n:number)=>typeof v==='string'?v.slice(0,n):'';
  const furniture=decodeFurniture(d.furniture,d.designVersion);
  return {...base,name:text(d.name,18)||'邻居的房间',owner:text(d.owner,24)||'岛上邻居',bio:text(d.bio,180),tags:Array.isArray(d.tags)?d.tags.filter(t=>typeof t==='string').slice(0,4).map(t=>t.slice(0,12)):[],color:COLORS.includes(String(d.color))?String(d.color):COLORS[0],floor:FLOORS.includes(String(d.floor))?String(d.floor):FLOORS[0],style:ROOM_STYLES.some(s=>s.id===d.style)?String(d.style):'oak',designVersion:2,furniture,occupied:true,mine:row.user_id===userId};
}

export function useWorldSync(scene:RefObject<WorldScene|null>) {
  const [user,setUser]=useState<User|null>(null),[status,setStatus]=useState(isSupabaseConfigured?'正在连接社区':'本地体验');
  const [sharedRooms,setRooms]=useState<Room[]>([]),[online,setOnline]=useState(0),[connected,setConnected]=useState(false);
  const userRef=useRef(user);useEffect(()=>{userRef.current=user;},[user]);
  const sessionId=useRef(crypto.randomUUID()),refreshRef=useRef<()=>Promise<void>>(async()=>{});
  useEffect(()=>{if(!isSupabaseConfigured)return;let alive=true;
    void supabase.auth.getSession().then(({data})=>{if(alive){setUser(data.session?.user||null);if(!data.session)setStatus('访客体验 · 登录后加入多人小镇');}});
    const {data}=supabase.auth.onAuthStateChange((_event,session)=>{setUser(session?.user||null);if(!session)setStatus('访客体验 · 登录后加入多人小镇');});
    return()=>{alive=false;data.subscription.unsubscribe();};
  },[]);
  useEffect(()=>{
    if(!user?.id)return;
    const id=user.id, sid=sessionId.current,world=scene.current;
    let alive=true,subscribed=false,lastFrame='',lastSent=0,seq=0,lease:string|null=null,pending=false,clockOffset=0,leaseStarted=0,seatRequest=0,roomRequest=0;
    let roomTimer:ReturnType<typeof setTimeout>|undefined,seatTimer:ReturnType<typeof setTimeout>|undefined;
    const release=async()=>{lease=null;await supabase.from('community_seats').delete().eq('user_id',id).eq('session_id',sid);};
    const fail=(message:string)=>{if(alive)setStatus(message);};
    const refreshRooms=async()=>{
      const request=++roomRequest;
      const {data,error}=await supabase.from('community_rooms').select('id,user_id,data').limit(100);
      if(!alive||request!==roomRequest)return;if(error){fail('房间同步失败，正在重试');return;}
      const next=(data||[]).map(r=>decodeRoom(r,id)).filter((r):r is Room=>r!==null);
      setRooms(previous=>{const old=new Map(previous.map(r=>[r.id,r]));const stable=next.map(r=>JSON.stringify(old.get(r.id))===JSON.stringify(r)?old.get(r.id)!:r);return stable.length===previous.length&&stable.every((r,i)=>r===previous[i])?previous:stable;});
    };
    const refreshSeats=async()=>{
      const request=++seatRequest,issued=Date.now();
      const {data,error}=await supabase.from('community_seats').select('*').gt('expires_at',new Date(Date.now()+clockOffset).toISOString()).limit(40);
      if(!alive||error||request!==seatRequest||(lease&&issued<leaseStarted))return;const seats=data as SharedSeat[];
      scene.current?.setSharedSeats(seats,id,sid);
      if(lease&&!seats.some(s=>s.user_id===id&&s.session_id===sid&&s.resource===lease)){lease=null;scene.current?.loseLease('座位已释放，请重新进入。');}
    };
    refreshRef.current=refreshRooms;
    const syncClock=async()=>{const start=Date.now();const {data,error}=await supabase.rpc('community_clock');if(alive&&!error&&Number.isFinite(data)){clockOffset=Number(data)-(start+Date.now())/2;scene.current?.setClockOffset(clockOffset);}void refreshSeats();};
    const channel=supabase.channel('community:island-01',{config:{private:true,presence:{key:sid},broadcast:{self:false}}});
    const send=()=>{
      if(!alive||!subscribed||!scene.current||document.hidden)return;
      const frame=scene.current.localFrame(),stamp=JSON.stringify(frame),now=Date.now();
      if(stamp===lastFrame&&now-lastSent<2000)return;
      lastFrame=stamp;lastSent=now;
      void channel.send({type:'broadcast',event:'move',payload:{...frame,id:sid,userId:id,name:publicName(userRef.current!),seq:++seq}});
    };
    channel.on('presence',{event:'sync'},()=>{
      const state=channel.presenceState<{userId:string;name:string}>();const ids=Object.keys(state);
      if(alive)setOnline(new Set(Object.values(state).flat().map(p=>p.userId)).size);
      scene.current?.retainPeers(ids);lastFrame='';lastSent=0;send();
    }).on('broadcast',{event:'move'},({payload})=>{
      if(!validPlayerFrame(payload)||payload.id===sid)return;
      const member=channel.presenceState<{userId:string}>()[payload.id];
      if(!member?.some(p=>p.userId===payload.userId))return;
      scene.current?.receivePeer(payload as PlayerFrame);
    }).on('postgres_changes',{event:'*',schema:'public',table:'community_rooms'},()=>{clearTimeout(roomTimer);roomTimer=setTimeout(()=>void refreshRooms(),180);})
      .on('postgres_changes',{event:'*',schema:'public',table:'community_seats'},()=>{clearTimeout(seatTimer);seatTimer=setTimeout(()=>void refreshSeats(),100);})
      .subscribe(state=>{
        if(!alive)return;subscribed=state==='SUBSCRIBED';setConnected(subscribed);
        if(subscribed){setStatus('多人同步已连接');void channel.track({userId:id,name:publicName(userRef.current!)});void refreshRooms();void syncClock();lastSent=0;}
        else if(state==='CHANNEL_ERROR'||state==='TIMED_OUT'||state==='CLOSED'){setStatus('连接中断，正在重连');setOnline(0);scene.current?.retainPeers([]);scene.current?.loseLease('网络断开，已安全退出项目。');void release();}
      });
    scene.current?.setNetwork({acquire:async(resource)=>{
      if(!subscribed)throw Error('社区尚未连接，请稍后重试。');
      if(pending)throw Error('正在申请座位，请稍候。');pending=true;
      try{const {data,error}=await supabase.rpc('community_acquire_seat',{p_resource:resource,p_session:sid});
        if(error)throw Error('无法申请座位，请检查网络后重试。');
        if(!data)throw Error('项目已满员，或你的账号正在另一个窗口体验。');
        if(!alive||!subscribed){await release();throw Error('连接已关闭。');}
        lease=resource;leaseStarted=Date.now();void refreshSeats();return data as number;
      }finally{pending=false;}
    },release:()=>{void release();}});
    void refreshRooms();void refreshSeats();
    const movement=setInterval(send,100);
    const heartbeat=setInterval(async()=>{
      if(lease){const {data,error}=await supabase.from('community_seats').update({expires_at:new Date().toISOString()}).eq('user_id',id).eq('session_id',sid).select('resource');
        if(alive&&(error||!data?.length)){scene.current?.loseLease('连接不稳定，已安全退出项目。');void release();}}
      if(!document.hidden){void refreshRooms();void refreshSeats();}
    },25000);
    const visible=()=>{if(!document.hidden){lastSent=0;void refreshRooms();void refreshSeats();send();}};
    document.addEventListener('visibilitychange',visible);
    return()=>{alive=false;subscribed=false;clearInterval(movement);clearInterval(heartbeat);clearTimeout(roomTimer);clearTimeout(seatTimer);document.removeEventListener('visibilitychange',visible);world?.setNetwork(null);world?.retainPeers([]);void release();void supabase.removeChannel(channel);};
  // Token refresh should not tear down the world or its leases.
  },[user?.id,scene]);
  const saveRoom=async(room:Room)=>{
    if(!user||!connected)throw Error('请等待多人社区连接成功后再保存。');
    const {error}=await supabase.from('community_rooms').upsert({id:room.id,user_id:user.id,data:{name:room.name,owner:publicName(user),bio:room.bio,tags:room.tags,color:room.color,floor:room.floor,style:room.style,designVersion:2,furniture:room.furniture},updated_at:new Date().toISOString()},{onConflict:'id'});
    if(error)throw Error(error.code==='23505'||error.code==='42501'?'这间房已被领取，或你已经拥有另一间房间。请刷新房间列表。':'保存失败，修改仍在编辑器中，请重试。');
    await refreshRef.current();
  };
  return {user,sharedRooms,online,connected,status,saveRoom};
}
