import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty';
import { useCreateRecordDialogStore } from '@/store/createRecordDialog';
import { useStore } from '@/store/useStore';
import { useTheme } from '@/components/theme-provider';

export function EmptyRecord() {
  const setOpenCreate = useCreateRecordDialogStore((state) => state.setOpen);
  const selectedSectionId = useStore((state) => state.selectedSectionId);
  const { theme } = useTheme();

  const isAllView = selectedSectionId === 'all';

  return (
    <Empty>
      <EmptyHeader>
        <img
          src={theme === 'light' ? '/empty-light.svg' : '/empty.svg'}
          className="w-[200px] mb-5"
          alt="Logo"
        />
        <EmptyTitle>Список записей пуст</EmptyTitle>
        <EmptyDescription className="sr-only">
          Используйте кнопку ниже для добавления нового элемента.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent className="flex-row justify-center gap-2">
        {isAllView ? (
          <Button
            variant="outline"
            onClick={() =>
              document.dispatchEvent(new CustomEvent('open-create-section'))
            }
          >
            <Plus />
            Создать раздел
          </Button>
        ) : (
          <Button variant="outline" onClick={() => setOpenCreate(true)}>
            <Plus />
            Создать запись
          </Button>
        )}
      </EmptyContent>
    </Empty>
  );
}
