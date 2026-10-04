import ReactDOM from 'react-dom/client';
import StandaloneTown from '../../components/community-world/StandaloneTown';
import './town.css';

ReactDOM.createRoot(document.getElementById('root')!).render(<StandaloneTown returnHref="/entrance-preview.html" storageKey="sugar-town-preview-quality"/>);
