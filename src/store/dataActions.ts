import { invoke } from '@tauri-apps/api/core';
import type { DataFile, Section, Entry } from '@/components/types/data-types';

export const loadData = async (): Promise<DataFile> => {
  const result = await invoke<string>('load_data');
  try {
    return JSON.parse(result);
  } catch {
    return { sections: [] };
  }
};

export const saveData = async (data: DataFile): Promise<void> => {
  await invoke('save_data', {
    data: JSON.stringify(data),
  });
};

export const addSection = (data: DataFile, section: Section): DataFile => ({
  ...data,
  sections: [...data.sections, section],
});

export const removeSection = (data: DataFile, sectionId: string): DataFile => ({
  ...data,
  sections: data.sections.filter((s) => s.id !== sectionId),
});

export const updateSection = (
  data: DataFile,
  sectionId: string,
  updates: Partial<Pick<Section, 'name' | 'icon'>>,
): DataFile => ({
  ...data,
  sections: data.sections.map((section) =>
    section.id === sectionId ? { ...section, ...updates } : section,
  ),
});

export const addEntry = (
  data: DataFile,
  sectionId: string,
  entry: Entry,
): DataFile => ({
  ...data,
  sections: data.sections.map((section) =>
    section.id === sectionId
      ? { ...section, entries: [...section.entries, entry] }
      : section,
  ),
});

export const removeEntry = (
  data: DataFile,
  sectionId: string,
  entryId: string,
): DataFile => ({
  ...data,
  sections: data.sections.map((section) =>
    section.id === sectionId
      ? { ...section, entries: section.entries.filter((e) => e.id !== entryId) }
      : section,
  ),
});

// Слияние импортируемых секций с текущими без перезаписи:
// существующие данные сохраняются, новые записи добавляются.
export const mergeSections = (
  existing: Section[],
  incoming: Section[],
): Section[] => {
  const merged: Section[] = existing.map((s) => ({
    ...s,
    entries: [...s.entries],
  }));

  for (const inc of incoming) {
    const idx = merged.findIndex((s) => s.id === inc.id);

    if (idx === -1) {
      merged.push({ ...inc, entries: [...inc.entries] });
      continue;
    }

    const target = merged[idx];
    const existingIds = new Set(target.entries.map((e) => e.id));
    const newEntries = inc.entries.filter((e) => !existingIds.has(e.id));
    merged[idx] = { ...target, entries: [...target.entries, ...newEntries] };
  }

  return merged;
};
