import { Condition, TCG } from '../types';

export const TCG_LABELS: Record<TCG, string> = {
  magic: 'Magic: The Gathering',
  pokemon: 'Pokémon TCG',
};

export const TCG_SHORT: Record<TCG, string> = {
  magic: 'MTG',
  pokemon: 'PKM',
};

export const CONDITION_LABELS: Record<Condition, string> = {
  M: 'Mint',
  NM: 'Near Mint',
  LP: 'Lightly Played',
  MP: 'Moderately Played',
  HP: 'Heavily Played',
  D: 'Damaged',
};

export const CONDITION_COLORS: Record<Condition, string> = {
  M: '#10b981',
  NM: '#22c55e',
  LP: '#84cc16',
  MP: '#f59e0b',
  HP: '#f97316',
  D: '#ef4444',
};

export const CONDITIONS: Condition[] = ['M', 'NM', 'LP', 'MP', 'HP', 'D'];
