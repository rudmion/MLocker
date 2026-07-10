import { useEffect } from 'react';
import { useCreateRecordDialogStore } from '@/store/createRecordDialog';

export function useKeyboardShortcuts() {
  const setOpenCreate = useCreateRecordDialogStore((state) => state.setOpen);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const ctrl = event.ctrlKey || event.metaKey;

      if (!ctrl) return;

      switch (event.key.toLowerCase()) {
        case 's':
          event.preventDefault();
          document.dispatchEvent(new CustomEvent('open-search'));
          break;
        case '+':
        case '=':
          event.preventDefault();
          setOpenCreate(true);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setOpenCreate]);
}
