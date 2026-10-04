import ReactDOM from 'react-dom/client';
import TownEntrance from '../../components/community-world/TownEntrance';
import PreviewShell from './PreviewShell';
import './entrance.css';

export function TownEntrancePreview() {
  return <PreviewShell>
    <TownEntrance enterHref="/town-preview.html"/>
  </PreviewShell>;
}

ReactDOM.createRoot(document.getElementById('root')!).render(<TownEntrancePreview/>);
