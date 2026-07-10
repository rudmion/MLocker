import { create } from 'zustand';

type CreateRecordDialogStore = {
  open: boolean;

  openDialog: () => void;
  closeDialog: () => void;
  setOpen: (open: boolean) => void;
};

export const useCreateRecordDialogStore = create<CreateRecordDialogStore>(
  (set) => ({
    open: false,
    openDialog: () => set({ open: true }),
    closeDialog: () => set({ open: false }),
    setOpen: (open) => set({ open }),
  }),
);
