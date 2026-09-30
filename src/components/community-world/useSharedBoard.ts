import { useCallback, useEffect, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import { publicName } from './useWorldSync';
export type Reply={id:string;text:string;date:string;author?:string;parentId?:string;replyTo?:string;liked?:boolean;rating?:number;userId?:string;likes?:number};
export type Post={id:string;category:string;title:string;body:string;author:string;date:string;example?:boolean;liked?:boolean;replies:Reply[];userId?:string;likes?:number;replyCount?:number};
const date=(value:string)=>new Date(value).toLocaleString('zh-CN');
export function useSharedBoard(user:User|null,selected:string|null){
  const [posts,setPosts]=useState<Post[]>([]),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
  const [more,setMore]=useState(false),[limit,setLimit]=useState(50);
  const userId=user?.id;
  const sequence=useRef(0),mutation=useRef(false);
  const [commentLimit,setCommentLimit]=useState(50),[moreComments,setMoreComments]=useState(false);
  const load=useCallback(async()=>{
    if(!userId)return;const request=++sequence.current;
    const result=await supabase.from('community_post_feed').select('*').order('created_at',{ascending:false}).limit(limit+1);
    if(result.error){setNotice('公告栏加载失败，请检查网络后重试。');return;}
    setMore(result.data.length>limit);
    const rows=result.data.slice(0,limit);
    if(selected&&!rows.some(p=>p.id===selected)){const extra=await supabase.from('community_post_feed').select('*').eq('id',selected).maybeSingle();if(extra.data)rows.unshift(extra.data);}
    const comments=selected?await supabase.from('community_comment_feed').select('*').eq('post_id',selected).order('created_at').limit(commentLimit+1):{data:[],error:null};
    if(request!==sequence.current)return;
    if(comments.error){setNotice('评论暂时无法加载，请稍后重试。');return;}
    setMoreComments(comments.data!.length>commentLimit);
    setPosts(rows.map(p=>({id:p.id,title:p.title,body:p.body,category:p.category,author:p.author,userId:p.user_id,date:date(p.created_at),likes:p.likes,liked:p.liked,replyCount:p.reply_count,replies:comments.data!.slice(0,commentLimit).filter(c=>c.post_id===p.id).map(c=>({id:c.id,text:c.body,date:date(c.created_at),author:c.author,userId:c.user_id,parentId:c.parent_id||undefined,replyTo:c.reply_to||undefined,rating:c.rating||undefined,likes:c.likes,liked:c.liked}))})));

  },[userId,selected,limit,commentLimit]);
  useEffect(()=>{
    if(!userId)return;let timer:ReturnType<typeof setTimeout>;
    const schedule=()=>{clearTimeout(timer);timer=setTimeout(()=>void load(),200);};
    const channel=supabase.channel(`community-board:${crypto.randomUUID()}`);
    for(const table of ['community_posts','community_comments','community_reactions'])channel.on('postgres_changes',{event:'*',schema:'public',table},schedule);
    channel.subscribe(state=>{if(state==='SUBSCRIBED')void load();});void load();
    const poll=setInterval(()=>{if(!document.hidden)void load();},30000);
    return()=>{clearTimeout(timer);clearInterval(poll);void supabase.removeChannel(channel);};
  },[load,userId]);
  const mutate=async(work:()=>PromiseLike<{error:unknown}>)=>{if(!user||mutation.current)return false;mutation.current=true;setBusy(true);try{const {error}=await work();if(error)throw error;await load();return true;}catch{setNotice('提交失败，输入内容已保留，请检查连接后重试。');return false;}finally{mutation.current=false;setBusy(false);}};
  return {posts,notice,busy,more,moreComments,loadComments:()=>setCommentLimit(n=>n+50),loadMore:()=>setLimit(n=>n+50),
    publish:(p:Post)=>mutate(()=>supabase.from('community_posts').insert({id:p.id,user_id:user!.id,author:publicName(user!),title:p.title,body:p.body,category:p.category})),
    reply:(postId:string,r:Reply)=>mutate(()=>supabase.from('community_comments').insert({id:r.id,post_id:postId,user_id:user!.id,author:publicName(user!),body:r.text,parent_id:r.parentId||null,reply_to:r.replyTo||null,rating:r.rating||null})),
    like:(postId:string,commentId:string|null,liked:boolean)=>mutate(()=>liked?supabase.from('community_reactions').delete().eq('user_id',user!.id).eq('target_id',commentId||postId):supabase.from('community_reactions').insert({user_id:user!.id,post_id:postId,comment_id:commentId,target_id:commentId||postId})),
    remove:(id:string)=>mutate(()=>supabase.from('community_comments').delete().eq('id',id).eq('user_id',user!.id))
  };
}
