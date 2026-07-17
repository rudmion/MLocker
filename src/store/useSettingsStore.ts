import { create } from 'zustand';
import {
  type PasswordOptions,
  DEFAULT_PASSWORD_OPTIONS,
} from '@/utils/generatePassword';

type Settings = {
  masterPasswordEnabled: boolean;
  passwordOptions: PasswordOptions;
};

type SettingsStore = Settings & {
  settingsOpen: boolean;
  setMasterPasswordEnabled: (enabled: boolean) => void;
  setPasswordOptions: (options: Partial<PasswordOptions>) => void;
  setSettingsOpen: (open: boolean) => void;
};

const STORAGE_KEY = 'mlocker-settings';

const loadSettings = (): Settings => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        masterPasswordEnabled: parsed.masterPasswordEnabled ?? true,
        passwordOptions: {
          ...DEFAULT_PASSWORD_OPTIONS,
          ...parsed.passwordOptions,
        },
      };
    }
  } catch {}
  return {
    masterPasswordEnabled: true,
    passwordOptions: DEFAULT_PASSWORD_OPTIONS,
  };
};

const saveSettings = (settings: Settings) => {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        masterPasswordEnabled: settings.masterPasswordEnabled,
        passwordOptions: settings.passwordOptions,
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

  setPasswordOptions: (options) => {
    const newOptions = { ...get().passwordOptions, ...options };
    set({ passwordOptions: newOptions });
    saveSettings({ ...get(), passwordOptions: newOptions });
  },

  setSettingsOpen: (open) => set({ settingsOpen: open }),
}));
