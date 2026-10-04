import { useEffect } from 'react';
import { useAppShell } from '../contexts/AppShellContext';
import TownEntrance from '../components/community-world/TownEntrance';
import './CommunityTown.css';

export default function CommunityTown(){
  const {setHeaderChrome}=useAppShell();
  useEffect(()=>{setHeaderChrome({searchPlaceholder:null,showAdd:false,contentScroll:false});return()=>setHeaderChrome(null);},[setHeaderChrome]);
  return <div className="community-town-page" data-release="community-town-frosted-entrance-v1"><TownEntrance/></div>;
}
