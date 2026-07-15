import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCreateRecordDialogStore } from '@/store/createRecordDialog';
import { useStore } from '@/store/useStore';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Kbd, KbdGroup } from '@/components/ui/kbd';
import { useEffect, useState } from 'react';

export function FloatingActionButton() {
  const setOpenCreate = useCreateRecordDialogStore((state) => state.setOpen);
  const selectedSectionId = useStore((state) => state.selectedSectionId);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const container = document.querySelector('.section-content');
    if (!container) return;

    const checkScroll = () => {
      const hasScroll = container.scrollHeight > container.clientHeight + 20;
      if (!hasScroll) {
        setIsVisible(true);
        return;
      }

      const atBottom =
        container.scrollTop + container.clientHeight >=
        container.scrollHeight - 10;
      setIsVisible(!atBottom);
    };

    checkScroll();
    container.addEventListener('scroll', checkScroll);
    return () => container.removeEventListener('scroll', checkScroll);
  }, []);

  if (selectedSectionId === 'all') return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 transition-opacity duration-200"
      style={{ opacity: isVisible ? 1 : 0, pointerEvents: isVisible ? 'auto' : 'none' }}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="icon-lg"
            onClick={() => setOpenCreate(true)}
            className=" rounded-full shadow-lg"
          >
            <Plus size={24} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left">
          Создать запись{' '}
          <KbdGroup>
            <Kbd>Ctrl</Kbd>
            <span>+</span>
            <Kbd>+</Kbd>
          </KbdGroup>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
