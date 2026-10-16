import { create } from 'zustand';

export type SortKey = 'date-desc' | 'date-asc' | 'name-asc';

const STORAGE_KEY = 'mlocker-section-sorts';

type SectionSorts = Record<string, SortKey[]>;

type SortStore = {
  sectionSorts: SectionSorts;
  toggleSort: (sectionId: string, key: SortKey) => void;
};

const loadSorts = (): SectionSorts => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as SectionSorts;
      }
    }
  } catch {}
  return {};
};

const saveSorts = (sorts: SectionSorts) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sorts));
  } catch {}
};

export const useSortStore = create<SortStore>((set, get) => ({
  sectionSorts: loadSorts(),

  toggleSort: (sectionId, key) => {
    const current = get().sectionSorts[sectionId] ?? [];
    // Одиночный выбор: клик по активной снимает её (сортировка выкл.),
    // клик по неактивной — делает её единственной активной.
    const next: SortKey[] = current.includes(key) ? [] : [key];

    const sectionSorts = { ...get().sectionSorts, [sectionId]: next };
    set({ sectionSorts });
    saveSorts(sectionSorts);
  },
}));
