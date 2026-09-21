import { useEffect, useState } from 'react';
import { OPEN_API_SETTINGS_EVENT, useApiKeys } from '../../contexts/ApiKeysContext';
import WebPet from './WebPet';
import PetChatDialog from './PetChatDialog';
import { OPEN_PET_CHAT_EVENT } from './petChatConfig';

export default function WebPetCompanion() {
  const { getActiveConfig, loading, activeProvider } = useApiKeys();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener(OPEN_PET_CHAT_EVENT, show);
    return () => window.removeEventListener(OPEN_PET_CHAT_EVENT, show);
  }, []);
  return <><WebPet onChat={() => setOpen(true)} />{open && <PetChatDialog key={activeProvider} config={getActiveConfig()} loadingConfig={loading} onClose={() => setOpen(false)} onSettings={() => { setOpen(false); window.dispatchEvent(new Event(OPEN_API_SETTINGS_EVENT)); }} />}</>;
}
