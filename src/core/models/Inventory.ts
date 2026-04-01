import type { StarFragmentData } from './StarFragment';
import type { StarStickData } from './StarStick';
import { generateId } from '../../shared/utils';

export interface PouchData {
  id: string;
  capacity: number;
  fragments: StarFragmentData[];
}

export interface InventoryState {
  pouches: PouchData[];
  starSticks: StarStickData[];
  activePouchIndex: number;
}

export function createDefaultInventory(): InventoryState {
  return {
    pouches: [{
      id: generateId(),
      capacity: 12,
      fragments: [],
    }],
    starSticks: [],
    activePouchIndex: 0,
  };
}

export function getActivePouch(inventory: InventoryState): PouchData {
  return inventory.pouches[inventory.activePouchIndex];
}

export function addFragment(inventory: InventoryState, fragment: StarFragmentData): boolean {
  const pouch = getActivePouch(inventory);
  if (pouch.fragments.length >= pouch.capacity) return false;
  pouch.fragments.push(fragment);
  return true;
}

export function getTotalFragmentCount(inventory: InventoryState): number {
  return inventory.pouches.reduce((sum, p) => sum + p.fragments.length, 0);
}
