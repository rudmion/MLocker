import { create } from 'zustand';
import type { DataFile, Section, Entry } from '@/components/types/data-types';
import * as actions from '@/store/dataActions';
import { notifications } from '@/lib/notifications';

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let pendingData: DataFile | null = null;

type VaultStore = {
  data: DataFile | null;
  isLoading: boolean;
  isSaving: boolean;

  selectedSectionId: string | 'all';
  selectedEntryId: string | null;
  inspectorOpen: boolean;

  loadData: () => Promise<void>;

  setSelectedSection: (id: string | 'all') => void;
  setSelectedEntry: (id: string | null) => void;
  setInspectorOpen: (open: boolean) => void;

  addSection: (section: Section) => void;
  updateSection: (sectionId: string, updates: Partial<Pick<Section, 'name' | 'icon'>>) => void;
  removeSection: (sectionId: string) => void;
  addEntry: (sectionId: string, entry: Entry) => void;
  removeEntry: (sectionId: string, entryId: string) => void;
  updateEntry: (
    sectionId: string,
    entryId: string,
    updatedEntry: Partial<Entry>,
  ) => void;

  saveToRust: (data: DataFile) => void;
  _commitSave: () => void;
};

export const useStore = create<VaultStore>((set, get) => ({
  data: null,
  isLoading: false,
  isSaving: false,

  selectedSectionId: 'all',
  selectedEntryId: null,
  inspectorOpen: false,

  setSelectedSection: (id) => set({ selectedSectionId: id }),
  setSelectedEntry: (id) => set({ selectedEntryId: id }),
  setInspectorOpen: (open) => set({ inspectorOpen: open }),

  _commitSave: () => {
    if (!pendingData) return;
    const data = pendingData;
    pendingData = null;

    set({ isSaving: true });

    actions.saveData(data)
      .then(() => {
        set({ isSaving: false });
      })
      .catch((e) => {
        console.error('save error:', e);
        notifications.saveFailed();
        set({ isSaving: false });
      });
  },

  loadData: async () => {
    set({ isLoading: true });

    try {
      const data = await actions.loadData();

      if (!data || !Array.isArray(data.sections)) {
        set({
          data: { sections: [] },
          isLoading: false,
        });
        return;
      }

      set({ data, isLoading: false });
    } catch (e) {
      console.error('loadData error:', e);
      notifications.loadFailed();

      set({
        data: { sections: [] },
        isLoading: false,
      });
    }
  },

  addSection: (section) => {
    const current = get().data;
    if (!current) return;

    const updated = actions.addSection(current, section);

    set({ data: updated });

    get().saveToRust(updated);
  },

  updateSection: (sectionId, updates) => {
    const current = get().data;
    if (!current) return;

    const updated = actions.updateSection(current, sectionId, updates);

    set({ data: updated });

    get().saveToRust(updated);
  },

  removeSection: (sectionId) => {
    const current = get().data;
    if (!current) return;

    const updated = actions.removeSection(current, sectionId);

    set({ data: updated });

    get().saveToRust(updated);
  },

  addEntry: (sectionId, entry) => {
    const current = get().data;
    if (!current) return;

    const updated = actions.addEntry(current, sectionId, entry);

    set({ data: updated });

    get().saveToRust(updated);
  },

  removeEntry: (sectionId, entryId) => {
    const current = get().data;
    if (!current) return;

    const updated = actions.removeEntry(current, sectionId, entryId);

    set({ data: updated });

    get().saveToRust(updated);
  },

  updateEntry: (sectionId, entryId, updatedEntry) => {
    const current = get().data;
    if (!current) return;

    const updatedSections = current.sections.map((section) => {
      if (section.id !== sectionId) return section;

      return {
        ...section,
        entries: section.entries.map((entry) => {
          if (entry.id !== entryId) return entry;

          return {
            ...entry,
            ...updatedEntry,
            updatedAt: new Date().toISOString(),
          };
        }),
      };
    });

    const updated = { ...current, sections: updatedSections };

    set({ data: updated });

    get().saveToRust(updated);
  },

  saveToRust: (data: DataFile) => {
    pendingData = data;

    if (saveTimer) {
      clearTimeout(saveTimer);
    }

    saveTimer = setTimeout(() => {
      get()._commitSave();
      saveTimer = null;
    }, 300);
  },
}));
