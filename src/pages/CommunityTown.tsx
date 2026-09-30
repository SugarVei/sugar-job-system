import { useEffect } from 'react';
import { useAppShell } from '../contexts/AppShellContext';
import CommunityWorld from '../components/community-world/CommunityWorld';
import './CommunityTown.css';

export default function CommunityTown(){
  const {setHeaderChrome}=useAppShell();
  useEffect(()=>{setHeaderChrome({searchPlaceholder:null,showAdd:false,contentScroll:false});return()=>setHeaderChrome(null);},[setHeaderChrome]);
  return <div className="community-town-page" data-release="community-town-multiplayer-v2"><CommunityWorld/></div>;
}
