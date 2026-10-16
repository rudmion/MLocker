import { create } from 'zustand';

export type MasterState =
  | 'loading'
  | 'setup'
  | 'locked'
  | 'recovery'
  | 'unlocked';

interface MasterStateStore {
  masterState: MasterState;
  setMasterState: (state: MasterState) => void;
}

export const useMasterStateStore = create<MasterStateStore>((set) => ({
  masterState: 'loading',
  setMasterState: (masterState) => set({ masterState }),
}));
