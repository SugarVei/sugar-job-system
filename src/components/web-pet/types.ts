import type { ComponentType } from 'react';

export type PetState = 'intro' | 'idle' | 'walk' | 'crawl' | 'run' | 'curious' | 'chasing' | 'happy' | 'annoyed' | 'angry' | 'runAway' | 'dragged' | 'falling' | 'tired' | 'sleep' | 'stretch' | 'playing' | 'sitting' | 'peek' | 'startled';
export interface Point { x: number; y: number }
export interface PetStats { mood: number; energy: number; affection: number }
export interface PetSnapshot {
  state: PetState;
  stats: PetStats;
  hidden: boolean;
  menu: boolean;
  bubble: string;
  hearts: number;
  ball: boolean;
  reducedMotion: boolean;
  direction: 1 | -1;
  turning: boolean;
  fps: number;
}
/** A future GLB renderer receives the same state and facing contract as the sprite. */
export interface PetCharacterProps { state: PetState; direction: 1 | -1; paused?: boolean; turning?: boolean }
export type PetRenderer = ComponentType<PetCharacterProps>;
export type PetAction = 'pet' | 'play' | 'sleep' | 'hide' | 'show' | 'menu' | 'closeMenu';
