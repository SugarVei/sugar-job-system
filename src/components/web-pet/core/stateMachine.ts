import type { PetState } from '../types';

export const PRIORITY: Record<PetState, number> = {
  intro: 10, idle: 0, walk: 0, crawl: 0, run: 0, sitting: 0, peek: 0, startled: 0,
  curious: 2, chasing: 3, tired: 4, sleep: 4, playing: 5,
  happy: 6, annoyed: 6, angry: 6, runAway: 6, stretch: 6, falling: 7, dragged: 8,
};

/** There is one active behavior. Replacing it cancels its destination/deadline. */
export class PetStateMachine {
  state: PetState = 'idle';
  until = 0;
  enter(next: PetState, now: number, duration: number, force = false) {
    if (!force && now < this.until && PRIORITY[next] < PRIORITY[this.state]) return false;
    this.state = next;
    this.until = now + duration;
    return true;
  }
}
