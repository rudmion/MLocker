import { create } from 'zustand';
import {
  type PasswordOptions,
  DEFAULT_PASSWORD_OPTIONS,
} from '@/utils/generatePassword';

type Settings = {
  passwordOptions: PasswordOptions;
};

type SettingsStore = Settings & {
  settingsOpen: boolean;
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
        passwordOptions: {
          ...DEFAULT_PASSWORD_OPTIONS,
          ...parsed.passwordOptions,
        },
      };
    }
  } catch {}
  return {
    passwordOptions: DEFAULT_PASSWORD_OPTIONS,
  };
};

const saveSettings = (settings: Settings) => {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        passwordOptions: settings.passwordOptions,
      }),
    );
  } catch {}
};

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  ...loadSettings(),
  settingsOpen: false,

  setPasswordOptions: (options) => {
    const newOptions = { ...get().passwordOptions, ...options };
    set({ passwordOptions: newOptions });
    saveSettings({ ...get(), passwordOptions: newOptions });
  },

  setSettingsOpen: (open) => set({ settingsOpen: open }),
}));
