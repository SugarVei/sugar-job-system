import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import PetPreview from './PetPreview';
import '../index.css';
import './PetPreview.css';

createRoot(document.getElementById('root')!).render(<StrictMode><PetPreview /></StrictMode>);
