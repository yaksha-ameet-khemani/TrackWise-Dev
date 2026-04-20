import { Entry } from '../types';
import { STORAGE_KEY } from '../constants';
import { sampleData } from '../data/sampleData';

export function loadEntries(): Entry[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored) as Entry[];
    saveEntries(sampleData);
    return sampleData;
  } catch {
    return sampleData;
  }
}

export function saveEntries(entries: Entry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch (e) {
    console.error('Failed to save:', e);
  }
}
