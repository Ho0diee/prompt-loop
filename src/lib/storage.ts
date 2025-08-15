import { Update, Heuristic } from '@/types';

const STORAGE_KEYS = {
  UPDATES: 'execution-notepad-updates',
  HEURISTICS: 'execution-notepad-heuristics',
  CURRENT_UPDATE: 'execution-notepad-current'
} as const;

export const storage = {
  // Updates
  getUpdates: (): Update[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.UPDATES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveUpdate: (update: Update): void => {
    const updates = storage.getUpdates();
    const existingIndex = updates.findIndex(u => u.id === update.id);
    
    if (existingIndex >= 0) {
      updates[existingIndex] = update;
    } else {
      updates.unshift(update);
    }
    
    localStorage.setItem(STORAGE_KEYS.UPDATES, JSON.stringify(updates));
  },

  deleteUpdate: (id: string): void => {
    const updates = storage.getUpdates().filter(u => u.id !== id);
    localStorage.setItem(STORAGE_KEYS.UPDATES, JSON.stringify(updates));
  },

  // Heuristics
  getHeuristics: (): Heuristic[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.HEURISTICS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveHeuristic: (heuristic: Heuristic): void => {
    const heuristics = storage.getHeuristics();
    const existingIndex = heuristics.findIndex(h => h.pattern === heuristic.pattern);
    
    if (existingIndex >= 0) {
      heuristics[existingIndex] = { ...heuristics[existingIndex], score: heuristic.score };
    } else {
      heuristics.push(heuristic);
    }
    
    localStorage.setItem(STORAGE_KEYS.HEURISTICS, JSON.stringify(heuristics));
  },

  // Current update
  getCurrentUpdate: (): Update | null => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CURRENT_UPDATE);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  setCurrentUpdate: (update: Update | null): void => {
    if (update) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_UPDATE, JSON.stringify(update));
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_UPDATE);
    }
  }
};