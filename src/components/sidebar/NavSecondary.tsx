import {
  SidebarGroup,
  SidebarGroupContent,
  useSidebar,
} from '@/components/ui/sidebar';
import { Plus } from 'lucide-react';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useStore } from '@/store/useStore';
import { useEffect, useState } from 'react';
import { notifications } from '@/lib/notifications';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function NavSecondary() {
  const addSection = useStore((state) => state.addSection);
  const { state } = useSidebar();

  const [open, setOpen] = useState(false);
  const [sectionName, setSectionName] = useState('');

  useEffect(() => {
    if (!open) {
      setSectionName('');
    }
  }, [open]);

  useEffect(() => {
    const handler = () => setOpen(true);
    document.addEventListener('open-create-section', handler);
    return () => document.removeEventListener('open-create-section', handler);
  }, []);

  const createSection = () => {
    if (!sectionName.trim()) return;
    const newSection = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      name: sectionName,
      icon: 'Folder',
      entries: [],
    };
    addSection(newSection);
    setSectionName('');
    setOpen(false);
    notifications.sectionCreated();
  };

  return (
    <SidebarGroup className="mt-auto">
      <SidebarGroupContent>
        <div className="flex gap-2 transition-all duration-200 ease-in-out ">
          <Dialog open={open} onOpenChange={setOpen}>
            {state === 'collapsed' ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <DialogTrigger asChild>
                    <Button
                      size="icon"
                      variant="outline"
                      className="transition-all duration-200"
                    >
                      <Plus />
                    </Button>
                  </DialogTrigger>
                </TooltipTrigger>
                <TooltipContent side="right">Создать раздел</TooltipContent>
              </Tooltip>
            ) : (
              <DialogTrigger asChild>
                <Button
                  size="icon"
                  variant="outline"
                  className="transition-all duration-200"
                >
                  <Plus />
                </Button>
              </DialogTrigger>
            )}
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle>Создать новый раздел</DialogTitle>
                <DialogDescription>
                  Внутри раздела будут храниться ваши пароли и логины. Дайте ему
                  понятное имя, чтобы легко ориентироваться.
                </DialogDescription>
              </DialogHeader>
              <Input
                placeholder="Введите название раздела"
                value={sectionName}
                onChange={(e) => setSectionName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') createSection();
                }}
                autoFocus
              />
              <DialogFooter>
                <Button onClick={createSection}>Создать</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
