import { create } from 'zustand';

type Settings = {
  masterPasswordEnabled: boolean;
  settingsOpen: boolean;
};

type SettingsStore = Settings & {
  setMasterPasswordEnabled: (enabled: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
};

const STORAGE_KEY = 'mlocker-settings';

const loadSettings = (): Settings => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {}
  return {
    masterPasswordEnabled: true,
    settingsOpen: false,
  };
};

const saveSettings = (settings: Settings) => {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        masterPasswordEnabled: settings.masterPasswordEnabled,
      }),
    );
  } catch {}
};

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  ...loadSettings(),
  settingsOpen: false,

  setMasterPasswordEnabled: (enabled) => {
    set({ masterPasswordEnabled: enabled });
    saveSettings({ ...get(), masterPasswordEnabled: enabled });
  },

  setSettingsOpen: (open) => set({ settingsOpen: open }),
}));
