import { useEffect, useState } from 'react';
import ElephantVideo from './ElephantVideo';
import { elephantClips } from './elephantAnimations';
import type { PetCharacterProps, PetState } from './types';

// The interactive ball is owned by PetController; do not add the video's second ball.
const clipsByState: Record<PetState, number> = {
  intro: 1, idle: 2, walk: 0, crawl: 0, run: 0, curious: 2, chasing: 0,
  happy: 1, annoyed: 2, angry: 2, runAway: 0, dragged: 2, falling: 0,
  tired: 3, sleep: 4, stretch: 1, playing: 0, sitting: 3, peek: 2, startled: 1,
};

export default function ElephantPet({ state, direction, paused = false }: PetCharacterProps) {
  const [reducedMotion, setReducedMotion] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  const speed = ['run', 'chasing', 'runAway', 'playing'].includes(state) ? 1.25 : 1;
  return <div className="pet-elephant" data-character="elephant" data-pose-state={state}>
    <ElephantVideo clip={elephantClips[clipsByState[state]]} direction={direction} paused={paused || reducedMotion} speed={speed} />
  </div>;
}
