export default function PetBubble({ text, sleeping }: { text: string; sleeping: boolean }) {
  return <>
    {text && <div className="pet-bubble" role="status">{text}</div>}
    {sleeping && <div className="pet-snooze" aria-hidden="true"><span>z</span><span>z</span><span>Z</span></div>}
  </>;
}
